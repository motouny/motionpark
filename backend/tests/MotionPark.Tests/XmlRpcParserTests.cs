using MotionPark.Infrastructure.Odoo;
using Xunit;

namespace MotionPark.Tests;

public class XmlRpcParserTests
{
    [Fact]
    public void Parses_nested_method_response()
    {
        const string xml = """
            <methodResponse>
              <params>
                <param>
                  <value>
                    <array>
                      <data>
                        <value><struct>
                          <member><name>id</name><value><int>12</int></value></member>
                          <member><name>slug</name><value><string>motion-plus</string></value></member>
                          <member><name>featured</name><value><boolean>1</boolean></value></member>
                          <member><name>price</name><value><double>499.5</double></value></member>
                        </struct></value>
                        <value><string>tail</string></value>
                      </data>
                    </array>
                  </value>
                </param>
              </params>
            </methodResponse>
            """;

        var result = XmlRpc.ParseResponse(xml);
        var list = Assert.IsType<List<object?>>(result);
        var row = Assert.IsType<Dictionary<string, object?>>(list[0]);
        Assert.Equal(12, row["id"]);
        Assert.Equal("motion-plus", row["slug"]);
        Assert.Equal(true, row["featured"]);
        Assert.Equal(499.5, row["price"]);
        Assert.Equal("tail", list[1]);
    }

    [Fact]
    public void Parses_scalar_login_response()
    {
        var result = XmlRpc.ParseResponse(
            "<methodResponse><params><param><value><int>7</int></value></param></params></methodResponse>");
        Assert.Equal(7, result);
    }

    [Fact]
    public void Fault_response_throws_with_code_and_message()
    {
        const string xml = """
            <methodResponse>
              <fault>
                <value><struct>
                  <member><name>faultCode</name><value><int>1</int></value></member>
                  <member><name>faultString</name><value><string>odoo.exceptions.AccessDenied</string></value></member>
                </struct></value>
              </fault>
            </methodResponse>
            """;

        var ex = Assert.Throws<XmlRpcFaultException>(() => XmlRpc.ParseResponse(xml));
        Assert.Equal(1, ex.Code);
        Assert.Contains("AccessDenied", ex.Message);
    }

    [Fact]
    public void Serializes_method_call_with_typed_params()
    {
        var body = XmlRpc.BuildMethodCall("execute_kw",
        [
            "db", 7, "secret",
            "res.partner", "search_read",
            new object?[] { new object?[] { "ref", "=", "abc" } },
            new Dictionary<string, object?> { ["limit"] = 1, ["flag"] = true },
        ]);

        Assert.Contains("<methodName>execute_kw</methodName>", body);
        Assert.Contains("<name>limit</name><value><int>1</int></value>", body);
        Assert.Contains("<boolean>1</boolean>", body);
        Assert.Contains("<string>ref</string>", body);
    }
}
