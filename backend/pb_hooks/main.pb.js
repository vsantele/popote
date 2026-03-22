/// <reference path="../pb_data/types.d.ts" />

// Hook to auto-generate unique share_code for events
// Executes before creating a new event record

onRecordCreateRequest((e) => {
  if (e.collection.name !== "events") {
    return
  }

  const record = e.record

  // Generate a unique 6-character alphanumeric share code
  const generateShareCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Check if share_code already exists
  const isCodeUnique = (code) => {
    try {
      const existing = $app.dao().findFirstRecordByData("events", "share_code", code)
      return !existing
    } catch (e) {
      // No record found, code is unique
      return true
    }
  }

  // Generate unique code (max 10 attempts)
  let shareCode = generateShareCode()
  let attempts = 0
  while (!isCodeUnique(shareCode) && attempts < 10) {
    shareCode = generateShareCode()
    attempts++
  }

  if (attempts >= 10) {
    throw new BadRequestError("Failed to generate unique share code. Please try again.")
  }

  // Set the share_code on the record
  record.set("share_code", shareCode)
}, "events")

// Hook to validate event data before save
onRecordCreateRequest((e) => {
  if (e.collection.name !== "events") {
    return
  }

  const record = e.record

  // Ensure host_name is not empty
  const hostName = record.get("host_name")
  if (!hostName || hostName.trim() === "") {
    throw new BadRequestError("Host name is required")
  }

  // Ensure host_device_id is not empty
  const hostDeviceId = record.get("host_device_id")
  if (!hostDeviceId || hostDeviceId.trim() === "") {
    throw new BadRequestError("Host device ID is required")
  }

  // Validate date is in the future (optional, can be removed if past events are allowed)
  const eventDate = record.get("date")
  if (eventDate) {
    const date = new Date(eventDate)
    const now = new Date()
    // Allow events from 1 day ago to account for timezone differences
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (date < oneDayAgo) {
      console.log(`Warning: Event date ${eventDate} is in the past`)
      // Not throwing error, just logging - past events might be for history
    }
  }
}, "events")

// Hook to auto-create host participant when event is created
onRecordAfterCreateSuccess((e) => {
  if (e.collection.name !== "events") {
    return
  }

  const event = e.record
  const hostName = event.get("host_name")
  const hostDeviceId = event.get("host_device_id")

  // Create participant record for the host
  const participantsCollection = $app.dao().findCollectionByNameOrId("participants")
  const participant = new Record(participantsCollection)

  participant.set("event", event.id)
  participant.set("name", hostName)
  participant.set("device_id", hostDeviceId)
  participant.set("is_host", true)

  try {
    $app.dao().saveRecord(participant)
  } catch (err) {
    console.error("Failed to create host participant:", err)
    // Don't throw - event is already created, participant can be created manually
  }
}, "events")

// Hook to validate item category
onRecordCreateRequest((e) => {
  if (e.collection.name !== "items") {
    return
  }

  const record = e.record
  const category = record.get("category")

  const validCategories = ["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"]
  if (!validCategories.includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(", ")}`)
  }
}, "items")

onRecordUpdateRequest((e) => {
  if (e.collection.name !== "items") {
    return
  }

  const record = e.record
  const category = record.get("category")

  const validCategories = ["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"]
  if (!validCategories.includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(", ")}`)
  }
}, "items")
