using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace MotionPark.Application.Messaging;

public interface IRequest<out TResponse> { }

public interface IRequestHandler<in TRequest, TResponse> where TRequest : IRequest<TResponse>
{
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
}

public interface ISender
{
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default);
}

/// <summary>Minimal MediatR-style dispatcher resolving handlers from the scoped container.</summary>
public sealed class Sender(IServiceProvider services) : ISender
{
    public async Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(request.GetType(), typeof(TResponse));
        var handler = services.GetService(handlerType)
            ?? throw new InvalidOperationException($"No handler registered for {request.GetType().Name}");
        var result = handlerType.GetMethod(nameof(IRequestHandler<IRequest<TResponse>, TResponse>.Handle))!
            .Invoke(handler, new object[] { request, cancellationToken });
        return await (Task<TResponse>)result!;
    }
}

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddMotionParkApplication(this IServiceCollection services)
    {
        services.AddScoped<ISender, Sender>();
        var assembly = typeof(IRequest<>).Assembly;
        foreach (var type in assembly.GetTypes().Where(t => t is { IsAbstract: false, IsInterface: false }))
        {
            foreach (var iface in type.GetInterfaces()
                         .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>)))
            {
                services.AddScoped(iface, type);
            }
        }
        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
