#:package Aspire.Hosting.Docker@13.2.2
#:package Aspire.Hosting.JavaScript@13.2.2
#:package Aspire.Hosting.PostgreSQL@13.2.2
#:sdk Aspire.AppHost.Sdk@13.2.2

var builder = DistributedApplication.CreateBuilder(args);

builder.AddDockerComposeEnvironment("compose");

var postgres = builder.AddPostgres("db").WithDataVolume(isReadOnly: false).WithPgAdmin();

var db = postgres.AddDatabase("popotedb");

#pragma warning disable ASPIRECERTIFICATES001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
var app = builder.AddViteApp("app", "./app")
    .WithPnpm()
    .WithHttpsDeveloperCertificate()
    .WithReference(db)
    .WaitFor(db);
#pragma warning restore ASPIRECERTIFICATES001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

builder.Build().Run();
