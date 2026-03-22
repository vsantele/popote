// PocketBase migration to create items collection
// Generated: 2024-01-15 00:02:00

migrate((db) => {
  const collection = {
    "name": "items",
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
        "name": "participant",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "participants",
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
          "max": 200
        }
      },
      {
        "name": "category",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": [
            "apero",
            "entree",
            "plat",
            "dessert",
            "boissons",
            "jeux",
            "autre"
          ]
        }
      },
      {
        "name": "quantity",
        "type": "text",
        "required": false,
        "options": {
          "max": 100
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
  return db.deleteCollection("items")
})
