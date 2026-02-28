const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database setup ────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'emergencyid.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id          TEXT PRIMARY KEY,
    saved_at    TEXT NOT NULL,
    name        TEXT,
    dob         TEXT,
    blood       TEXT,
    allergies   TEXT,
    conditions  TEXT,
    medications TEXT,
    notes       TEXT,
    ec_name     TEXT,
    ec_rel      TEXT,
    ec_phone    TEXT,
    profile_url TEXT,
    qr_api_url  TEXT
  )
`);

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serves index.html, profile.html, etc.

// ── API: List all profiles ────────────────────────────────────────────
app.get('/api/profiles', (req, res) => {
  const rows = db.prepare('SELECT * FROM profiles ORDER BY saved_at DESC').all();
  res.json(rows.map(dbRowToProfile));
});

// ── API: Get single profile ───────────────────────────────────────────
app.get('/api/profiles/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(dbRowToProfile(row));
});

// ── API: Save / upsert profile ────────────────────────────────────────
app.post('/api/profiles', (req, res) => {
  const p = req.body;
  if (!p || !p.id) return res.status(400).json({ error: 'Invalid profile data' });

  db.prepare(`
    INSERT INTO profiles
      (id, saved_at, name, dob, blood, allergies, conditions, medications,
       notes, ec_name, ec_rel, ec_phone, profile_url, qr_api_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      saved_at    = excluded.saved_at,
      name        = excluded.name,
      dob         = excluded.dob,
      blood       = excluded.blood,
      allergies   = excluded.allergies,
      conditions  = excluded.conditions,
      medications = excluded.medications,
      notes       = excluded.notes,
      ec_name     = excluded.ec_name,
      ec_rel      = excluded.ec_rel,
      ec_phone    = excluded.ec_phone,
      profile_url = excluded.profile_url,
      qr_api_url  = excluded.qr_api_url
  `).run(
    p.id,
    p.savedAt || new Date().toISOString(),
    p.name || '',
    p.dob || '',
    p.blood || '',
    p.allergies || '',
    p.conditions || '',
    p.medications || '',
    p.notes || '',
    p.ecName || '',
    p.ecRel || '',
    p.ecPhone || '',
    p.profileUrl || '',
    p.qrApiUrl || ''
  );

  res.json({ success: true });
});

// ── API: Delete profile ───────────────────────────────────────────────
app.delete('/api/profiles/:id', (req, res) => {
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Map DB row → frontend profile object ─────────────────────────────
function dbRowToProfile(row) {
  return {
    id:          row.id,
    savedAt:     row.saved_at,
    name:        row.name,
    dob:         row.dob,
    blood:       row.blood,
    allergies:   row.allergies,
    conditions:  row.conditions,
    medications: row.medications,
    notes:       row.notes,
    ecName:      row.ec_name,
    ecRel:       row.ec_rel,
    ecPhone:     row.ec_phone,
    profileUrl:  row.profile_url,
    qrApiUrl:    row.qr_api_url
  };
}

// ── Start ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`EmergencyID server running → http://localhost:${PORT}`);
});
