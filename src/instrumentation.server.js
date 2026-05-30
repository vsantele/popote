import { env } from "$env/dynamic/private";
import { ensureCloudflareTelemetry } from "$lib/server/telemetry";

void ensureCloudflareTelemetry(env);
