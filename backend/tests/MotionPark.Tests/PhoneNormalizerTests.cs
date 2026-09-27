using MotionPark.Application.Common;

namespace MotionPark.Tests;

public class PhoneNormalizerTests
{
    [Theory]
    [InlineData("0561234567", "+966561234567")]
    [InlineData("561234567", "+966561234567")]
    [InlineData("966561234567", "+966561234567")]
    [InlineData("+966561234567", "+966561234567")]
    [InlineData("00966561234567", "+966561234567")]
    [InlineData(" 056 123 4567 ", "+966561234567")]
    public void Normalizes_saudi_mobile_formats(string input, string expected)
        => Assert.Equal(expected, PhoneNormalizer.Normalize(input));

    [Theory]
    [InlineData("123")]
    [InlineData("021234567")]
    [InlineData("05123456a")]
    [InlineData("")]
    [InlineData(null)]
    public void Rejects_non_mobile_input(string? input)
        => Assert.Null(PhoneNormalizer.Normalize(input));
}
