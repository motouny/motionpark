using System.Globalization;
using System.Text;
using System.Xml;

namespace MotionPark.Infrastructure.Odoo;

public sealed class XmlRpcFaultException(long code, string message) : Exception(message)
{
    public long Code { get; } = code;
}

/// <summary>Minimal, dependency-free XML-RPC 1.0 serializer/parser for Odoo's /xmlrpc/2 endpoints.</summary>
public static class XmlRpc
{
    public static string BuildMethodCall(string methodName, IReadOnlyList<object?> args)
    {
        var sb = new StringBuilder();
        using (var w = XmlWriter.Create(sb, new XmlWriterSettings { OmitXmlDeclaration = true }))
        {
            w.WriteStartElement("methodCall");
            w.WriteElementString("methodName", methodName);
            w.WriteStartElement("params");
            foreach (var arg in args)
            {
                w.WriteStartElement("param");
                WriteValue(w, arg);
                w.WriteEndElement();
            }
            w.WriteEndElement();
            w.WriteEndElement();
        }
        return sb.ToString();
    }

    private static void WriteValue(XmlWriter w, object? value)
    {
        w.WriteStartElement("value");
        switch (value)
        {
            case null:
                w.WriteStartElement("string");
                w.WriteEndElement();
                break;
            case string s:
                w.WriteElementString("string", s);
                break;
            case bool b:
                w.WriteElementString("boolean", b ? "1" : "0");
                break;
            case int i:
                w.WriteElementString("int", i.ToString(CultureInfo.InvariantCulture));
                break;
            case long l:
                w.WriteElementString("i4", l.ToString(CultureInfo.InvariantCulture));
                break;
            case double d:
                w.WriteElementString("double", d.ToString(CultureInfo.InvariantCulture));
                break;
            case DateTime dt:
                w.WriteElementString("dateTime.iso8601", dt.ToString("yyyyMMdd'T'HH:mm:ss", CultureInfo.InvariantCulture));
                break;
            case IDictionary<string, object?> dict:
                w.WriteStartElement("struct");
                foreach (var (key, v) in dict)
                {
                    w.WriteStartElement("member");
                    w.WriteElementString("name", key);
                    WriteValue(w, v);
                    w.WriteEndElement();
                }
                w.WriteEndElement();
                break;
            case System.Collections.IEnumerable seq:
                w.WriteStartElement("array");
                w.WriteStartElement("data");
                foreach (var item in seq) WriteValue(w, item);
                w.WriteEndElement();
                w.WriteEndElement();
                break;
            default:
                w.WriteElementString("string", value.ToString());
                break;
        }
        w.WriteEndElement();
    }

    /// <summary>Parse a methodResponse body. Throws <see cref="XmlRpcFaultException"/> on &lt;fault&gt;.</summary>
    public static object? ParseResponse(string xml)
    {
        using var reader = XmlReader.Create(new StringReader(xml),
            new XmlReaderSettings { DtdProcessing = DtdProcessing.Ignore, XmlResolver = null });
        while (reader.Read())
        {
            if (reader.NodeType != XmlNodeType.Element) continue;
            switch (reader.Name)
            {
                case "fault":
                    reader.ReadToDescendant("value");
                    var fault = ParseValue(reader);
                    var code = 0L;
                    var message = "Odoo XML-RPC fault";
                    if (fault is Dictionary<string, object?> f)
                    {
                        if (f.TryGetValue("faultCode", out var c)) code = Convert.ToInt64(c);
                        if (f.TryGetValue("faultString", out var m)) message = m?.ToString() ?? message;
                    }
                    throw new XmlRpcFaultException(code, message);
                case "value":
                    return ParseValue(reader);
            }
        }
        throw new FormatException("No <value> found in XML-RPC response.");
    }

    /// <summary>Position on a start element with the given name — already there counts.</summary>
    private static void MoveToElement(XmlReader reader, string name)
    {
        if (reader.NodeType == XmlNodeType.Element && reader.Name == name) return;
        while (reader.Read())
        {
            if (reader.NodeType == XmlNodeType.Element && reader.Name == name) return;
            if (reader.NodeType == XmlNodeType.EndElement)
                throw new FormatException($"Expected <{name}> before </{reader.Name}>.");
        }
        throw new FormatException($"Expected <{name}>.");
    }

    private static object? ParseValue(XmlReader reader)
    {
        // reader is positioned on <value>
        if (reader.IsEmptyElement)
        {
            reader.Read();
            return null;
        }
        reader.Read();
        while (reader.NodeType == XmlNodeType.Whitespace || reader.NodeType == XmlNodeType.Comment) reader.Read();

        if (reader.NodeType == XmlNodeType.EndElement && reader.Name == "value")
        {
            reader.Read();
            return string.Empty; // <value></value> → empty string
        }
        if (reader.NodeType != XmlNodeType.Element)
        {
            var text = reader.Value;
            while (!(reader.NodeType == XmlNodeType.EndElement && reader.Name == "value")) reader.Read();
            reader.Read();
            return text;
        }

        object? result;
        switch (reader.Name)
        {
            case "string":
                result = reader.ReadElementContentAsString();
                break;
            case "int":
            case "i4":
                result = int.Parse(reader.ReadElementContentAsString(), CultureInfo.InvariantCulture);
                break;
            case "boolean":
                result = reader.ReadElementContentAsString() == "1";
                break;
            case "double":
                result = double.Parse(reader.ReadElementContentAsString(), NumberStyles.Any, CultureInfo.InvariantCulture);
                break;
            case "dateTime.iso8601":
                result = DateTime.ParseExact(reader.ReadElementContentAsString(), "yyyyMMdd'T'HH:mm:ss",
                    CultureInfo.InvariantCulture);
                break;
            case "array":
                {
                    var list = new List<object?>();
                    if (reader.IsEmptyElement)
                    {
                        reader.Read();
                    }
                    else
                    {
                        reader.Read();
                        while (!(reader.NodeType == XmlNodeType.EndElement && reader.Name == "array"))
                        {
                            if (reader.NodeType == XmlNodeType.Element && reader.Name == "value")
                                list.Add(ParseValue(reader));
                            else reader.Read();
                        }
                        reader.Read(); // </array>
                    }
                    result = list;
                    goto consumed;
                }
            case "struct":
                {
                    var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    reader.Read();
                    while (!(reader.NodeType == XmlNodeType.EndElement && reader.Name == "struct"))
                    {
                        if (reader.NodeType == XmlNodeType.Element && reader.Name == "member")
                        {
                            MoveToElement(reader, "name");
                            var name = reader.ReadElementContentAsString();
                            MoveToElement(reader, "value");
                            dict[name] = ParseValue(reader);
                            while (reader.NodeType != XmlNodeType.EndElement || reader.Name != "member") reader.Read();
                            reader.Read(); // </member>
                        }
                        else reader.Read();
                    }
                    reader.Read(); // </struct>
                    result = dict;
                    goto consumed;
                }
            default:
                result = reader.ReadElementContentAsString();
                break;
        }

        // Consume </value>
        while (!(reader.NodeType == XmlNodeType.EndElement && reader.Name == "value")) reader.Read();
        reader.Read();
        return result;

    consumed:
        while (!(reader.NodeType == XmlNodeType.EndElement && reader.Name == "value")) reader.Read();
        reader.Read();
        return result;
    }
}
