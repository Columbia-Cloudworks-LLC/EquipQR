import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Seed only the committed UUID-named fixtures into the isolated Linux database.
export async function seedMedia(root, local) {
  const client = createClient('http://127.0.0.1:54321', local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const uploader = 'bb0e8400-e29b-41d4-a716-446655440001';
  const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
  async function checked(query) {
    const { data, error } = await query;
    if (error) throw new Error(`Local media seed: ${error.message}`);
    return data;
  }
  let count = 0;
  for (const [folder, table, bucket] of [
    ['equipment', 'equipment', 'equipment-note-images'],
    ['organizations', 'organizations', 'organization-logos'],
    ['teams', 'teams', 'team-images'],
  ]) {
    const dir = path.join(root, 'supabase/seed-images', folder);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir).sort()) {
      const ext = path.extname(filename).toLowerCase();
      const id = path.basename(filename, ext);
      if (!types[ext] || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) continue;
      const row = await checked(client.from(table).select('*').eq('id', id).maybeSingle());
      if (!row) continue;
      let objectPath;
      let noteId;
      if (folder === 'equipment') {
        const notes = await checked(client.from('equipment_notes').select('id').eq('equipment_id', id).order('created_at').limit(1));
        noteId = notes[0]?.id ?? randomUUID();
        if (!notes.length) await checked(client.from('equipment_notes').insert({ id: noteId, equipment_id: id, author_id: uploader, content: 'Auto-created seed note for local dev media.', is_private: false }));
        objectPath = `${uploader}/${id}/${noteId}/${filename}`;
      } else if (folder === 'teams') objectPath = `${row.organization_id}/${id}/image${ext}`;
      else objectPath = `${id}/logo${ext}`;
      const bytes = fs.readFileSync(path.join(dir, filename));
      await checked(client.storage.from(bucket).upload(objectPath, bytes, { contentType: types[ext], upsert: true }));
      const update = folder === 'organizations'
        ? { logo: `http://localhost:54321/storage/v1/object/public/${bucket}/${objectPath}` }
        : { image_url: objectPath };
      await checked(client.from(table).update(update).eq('id', id));
      if (noteId) {
        const images = await checked(client.from('equipment_note_images').select('id').eq('equipment_note_id', noteId).eq('file_url', objectPath));
        if (!images.length) await checked(client.from('equipment_note_images').insert({ equipment_note_id: noteId, file_name: filename, file_url: objectPath, file_size: bytes.length, mime_type: types[ext], uploaded_by: uploader }));
      }
      count++;
    }
  }
  console.log(`Seeded ${count} local equipment, organization, and team images.`);
}
