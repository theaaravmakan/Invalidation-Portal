// // Lambda: invalidate.js (Node.js 18.x runtime recommended)
// import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

// // Env vars to set in Lambda configuration
// // DISTRIBUTION_ID = E*************
// // AWS_REGION = us-east-1 (CloudFront control-plane)
// // ALLOW_WILDCARD = "false"  // set "true" only if you want to allow '/*'
// // ALLOWED_ORIGIN = "*" or your domain for CORS

// const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID;
// const AWS_REGION = process.env.AWS_REGION || "us-east-1";
// const ALLOW_WILDCARD = String(process.env.ALLOW_WILDCARD || "false").toLowerCase() === "true";
// const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// export const handler = async (event) => {
//   // CORS preflight
//   if (event.requestContext?.http?.method === "OPTIONS") {
//     return {
//       statusCode: 204,
//       headers: corsHeaders(),
//     };
//   }

//   try {
//     const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
//     const paths = Array.isArray(body.paths) ? body.paths.map(String) : [];

//     // Basic validations
//     if (!DISTRIBUTION_ID) {
//       return response(500, { success: false, message: "Lambda not configured with DISTRIBUTION_ID" });
//     }
//     if (!paths.length) {
//       return response(400, { success: false, message: "paths array required" });
//     }
//     for (const p of paths) {
//       if (!p || typeof p !== "string" || !p.startsWith("/")) {
//         return response(400, { success: false, message: "each path must be a non-empty string starting with '/'" });
//       }
//     }

//     // Wildcard guard (security)
//     if (!ALLOW_WILDCARD && paths.some((p) => p.trim() === "/*")) {
//       return response(403, { success: false, message: "Wildcard '/*' invalidation is disabled" });
//     }

//     // Optional: use identity/role from headers (if using authorizer)
//     const userEmail = event.headers?.["x-user-email"] || event.headers?.["X-User-Email"] || "unknown";
//     const userRole = event.headers?.["x-user-role"] || event.headers?.["X-User-Role"] || "unknown";

//     const client = new CloudFrontClient({ region: AWS_REGION });
//     const cmd = new CreateInvalidationCommand({
//       DistributionId: DISTRIBUTION_ID,
//       InvalidationBatch: {
//         CallerReference: `lambda-${Date.now()}`,
//         Paths: { Quantity: paths.length, Items: paths },
//       },
//     });

//     const data = await client.send(cmd);

//     return response(200, {
//       success: true,
//       actor: { email: userEmail, role: userRole },
//       distributionId: DISTRIBUTION_ID,
//       invalidationId: data?.Invalidation?.Id || null,
//       status: data?.Invalidation?.Status || null,
//       paths,
//     });
//   } catch (err) {
//     console.error("Lambda error:", err);
//     return response(500, { success: false, message: "Invalidation failed", error: err?.message || String(err) });
//   }
// };

// // helpers
// function response(statusCode, body) {
//   return {
//     statusCode,
//     headers: corsHeaders(),
//     body: JSON.stringify(body),
//   };
// }
// function corsHeaders() {
//   return {
//     "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
//     "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Email,X-User-Role",
//     "Access-Control-Allow-Methods": "POST,OPTIONS",
//   };
// }
