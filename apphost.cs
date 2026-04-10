#:package Aspire.Hosting.Docker@13.2.2
#:package Aspire.Hosting.JavaScript@13.2.2
#:package Aspire.Hosting.PostgreSQL@13.2.2
#:sdk Aspire.AppHost.Sdk@13.2.2

var builder = DistributedApplication.CreateBuilder(args);

builder.AddDockerComposeEnvironment("compose");

#pragma warning disable ASPIRECOMPUTE003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
var registry = builder.AddContainerRegistry(
    "ghcr",                              // Registry name
    "ghcr.io",                           // Registry endpoint
    "vsantele/popote"     // Repository path
);
#pragma warning restore ASPIRECOMPUTE003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

var postgres = builder.AddPostgres("db").WithDataVolume(isReadOnly: false).WithPgAdmin();

var db = postgres.AddDatabase("popotedb");

#pragma warning disable ASPIRECERTIFICATES001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
#pragma warning disable ASPIRECOMPUTE003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
var app = builder.AddViteApp("app", "./app")
    .WithPnpm()
    .WithHttpsDeveloperCertificate()
    .WithReference(db)
    .WaitFor(db)
    .WithExternalHttpEndpoints()
    .PublishAsDockerComposeService((resource, service) =>
    {
        service.Name = "app";
    })
    .WithContainerRegistry(registry);
#pragma warning restore ASPIRECOMPUTE003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
#pragma warning restore ASPIRECERTIFICATES001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

builder.Build().Run();
