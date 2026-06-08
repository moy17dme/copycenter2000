import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readDotEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }

  return env;
}

const root = process.cwd();
const localEnv = readDotEnv(path.join(root, ".env"));

const supabaseUrl = localEnv.VITE_SUPABASE_URL;
const serviceRoleKey = localEnv.VITE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SERVICE_ROLE_KEY en .env.");
}

if (!adminEmail || !adminPassword) {
  throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD antes de ejecutar el script.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const normalizedEmail = adminEmail.trim().toLowerCase();
const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;

let user = listed.data.users.find(
  (candidate) => (candidate.email || "").toLowerCase() === normalizedEmail
);

if (!user) {
  const created = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  user = created.data.user;
  console.log("admin_user_created");
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password: adminPassword,
    email_confirm: true,
  });
  if (updated.error) throw updated.error;
  user = updated.data.user;
  console.log("admin_user_updated");
}

let profileWrite = await admin
  .from("profiles")
  .upsert(
    {
      id: user.id,
      email: normalizedEmail,
      role: "admin",
    },
    { onConflict: "id" }
  );

if (profileWrite.error?.code === "PGRST204") {
  profileWrite = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role: "admin",
      },
      { onConflict: "id" }
    );
}

if (profileWrite.error) throw profileWrite.error;

const profileRead = await admin
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (profileRead.error) throw profileRead.error;

console.log(
  JSON.stringify({
    email: normalizedEmail,
    role: profileRead.data.role,
    user: `${user.id.slice(0, 8)}...`,
  })
);
