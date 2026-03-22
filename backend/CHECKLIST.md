# Backend Setup Checklist

Quick checklist for getting the Popote backend running.

## ✅ Pre-Setup (Done)

- [x] Backend directory structure created
- [x] PocketBase migrations written (3 collections)
- [x] Business logic hooks implemented
- [x] Schema documentation created
- [x] API examples documented
- [x] .gitignore configured
- [x] Start scripts created (Windows & Linux/macOS)

## 📋 Setup Steps (To Do)

### 1. Download PocketBase

- [x] Visit https://github.com/pocketbase/pocketbase/releases
- [x] Download latest version for your platform:
  - Windows: `pocketbase_*_windows_amd64.zip`
  - macOS: `pocketbase_*_darwin_amd64.zip` (Intel) or `darwin_arm64` (Apple Silicon)
  - Linux: `pocketbase_*_linux_amd64.zip`
- [x] Extract the executable
- [x] Move `pocketbase` or `pocketbase.exe` to `backend/` directory

### 2. First Run

- [x] Run start script:
  - Windows: `.\start.ps1`
  - Linux/macOS: `./start.sh` (may need `chmod +x start.sh` first)
- [x] Verify server starts on http://127.0.0.1:8090

### 3. Admin Setup

- [x] Navigate to http://127.0.0.1:8090/_/
- [x] Create admin account (email + password)
- [x] Verify collections are created:
  - [x] events
  - [x] participants  
  - [x] items
  
### 4. Test Hooks

- [ ] Create a test event via Admin UI or API
- [ ] Verify `share_code` is auto-generated (6 characters)
- [ ] Verify host participant is auto-created
- [ ] Check `pb_data/logs/` for any errors

### 5. API Testing

- [ ] Test event creation via curl (see API_EXAMPLES.md)
- [ ] Test item creation with valid category
- [ ] Test item creation with invalid category (should fail)
- [ ] Verify realtime subscription works

### 6. Flutter Integration Ready

- [ ] Backend running on http://127.0.0.1:8090
- [ ] Share API URL with Dallas (Flutter dev)
- [ ] Provide API_EXAMPLES.md for reference

## 🔍 Verification

Run these checks to ensure everything works:

```bash
# 1. Check server is running
curl http://127.0.0.1:8090/api/health

# 2. Create test event
curl -X POST http://127.0.0.1:8090/api/collections/events/records \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "date": "2024-12-31 20:00:00",
    "host_name": "Test Host",
    "host_device_id": "test-device-123"
  }'

# Expected: Response with auto-generated share_code

# 3. List events
curl http://127.0.0.1:8090/api/collections/events/records

# 4. List participants (should include auto-created host)
curl http://127.0.0.1:8090/api/collections/participants/records
```

## 🐛 Troubleshooting

### Port 8090 already in use
```bash
# Stop existing PocketBase
# Windows: Find process in Task Manager
# Linux/macOS:
lsof -ti:8090 | xargs kill -9
```

### Migrations not applying
- Delete `pb_data/` directory
- Restart PocketBase (migrations will re-run)

### Hooks not working
- Check `pb_data/logs/latest.log` for JavaScript errors
- Verify `pb_hooks/main.pb.js` syntax
- Restart PocketBase after hook changes

### Share code not generating
- Check logs for uniqueness collision errors
- Verify events collection has `share_code` field
- Test manually: create event and inspect response

## 📞 Next Steps

Once backend is running:

1. **Coordinate with Dallas:** Share API URL and examples
2. **Test realtime:** Verify SSE works from Flutter
3. **Monitor logs:** Check for any errors during development
4. **Backup database:** Copy `pb_data/data.db` regularly

## 📝 Notes

- Backend runs on **localhost** by default (not accessible from network)
- For mobile testing, may need to expose via ngrok or local network IP
- Admin UI is at `/_/` (underscore slash)
- API is at `/api/`
- Realtime is at `/api/realtime`

---

**Status:** Backend infrastructure ready for PocketBase installation and first run.
