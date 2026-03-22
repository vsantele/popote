// PocketBase migration to create participants collection
// Generated: 2024-01-15 00:01:00

migrate((db) => {
  const collection = {
    "name": "participants",
    "type": "base",
    "system": false,
    "schema": [
      {
        "name": "event",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "events",
          "cascadeDelete": true,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "device_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "is_host",
        "type": "bool",
        "required": false,
        "options": {}
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
  return db.deleteCollection("participants")
})
