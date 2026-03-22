// PocketBase migration to create events collection
// Generated: 2024-01-15 00:00:00

migrate((db) => {
  const collection = {
    "name": "events",
    "type": "base",
    "system": false,
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 200
        }
      },
      {
        "name": "date",
        "type": "date",
        "required": true,
        "options": {}
      },
      {
        "name": "location",
        "type": "text",
        "required": false,
        "options": {
          "max": 500
        }
      },
      {
        "name": "description",
        "type": "text",
        "required": false,
        "options": {
          "max": 2000
        }
      },
      {
        "name": "host_name",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "host_device_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "share_code",
        "type": "text",
        "required": true,
        "options": {
          "min": 6,
          "max": 6,
          "pattern": "^[A-Z0-9]{6}$"
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": ""
  }

  return db.importCollections([collection], false)
}, (db) => {
  return db.deleteCollection("events")
})
