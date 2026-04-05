// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from "./.modules/aspire.js"

const builder = await createBuilder()

await builder.addDockerComposeEnvironment("compose")

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

await builder.build().run()
