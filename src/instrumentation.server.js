import * as env from "$app/env/private";
import { ensureCloudflareTelemetry } from "#lib/server/telemetry.js";

void ensureCloudflareTelemetry(env);
