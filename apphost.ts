// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from "./.modules/aspire.js"

const builder = await createBuilder()

await builder.addDockerComposeEnvironment("compose")

// Add your resources here, for example:
// const redis = await builder.addContainer("cache", "redis:latest");
// const postgres = await builder.addPostgres("db");

const postgres = await builder
  .addPostgres("db")
  .withDataVolume({ isReadOnly: false })

const db = await postgres.addDatabase("popotedb")

const app = await builder
  .addViteApp("app", "./app")
  .withPnpm()
  .withHttpsDeveloperCertificate()
  .withReference(db)
  .waitFor(db)
  .withEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Disable TLS verification for development

await builder.build().run()
