<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card"
  import { Badge } from "$lib/components/ui/badge"
  import { Separator } from "$lib/components/ui/separator"
  import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui/toggle-group"
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "$lib/components/ui/dialog"
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select"
  import {
    CATEGORIES,
    CATEGORY_ORDER,
    type Item,
    type ItemCategory,
  } from "$lib/types/index"
  import { log } from "$lib/utils/logger"
  import { createRealtimeStore } from "$lib/stores/realtime.svelte"
  import { onMount } from "svelte"
  import { superForm } from "sveltekit-superforms/client"
  import { invalidateAll } from "$app/navigation"

  let { data } = $props()

  let viewMode = $state<"category" | "person">("category")
  let dialogOpen = $state(false)

  // Create real-time store (initialize once with data)
  let realtime = $state(
    createRealtimeStore(data.event.share_code, data.items, data.participants),
  )

  // Get reactive state from store
  let items = $derived(realtime.items)
  let participants = $derived(realtime.participants)

  // Setup Superform for adding items
  const { form, errors, enhance, delayed, message } = superForm(data.form, {
    resetForm: true,
    onUpdated: async ({ form }) => {
      if (form.valid) {
        // Close dialog and refresh data
        dialogOpen = false
        await invalidateAll()
      }
    },
  })

  // Set default category to 'plat' if not set
  if (!$form.category) {
    $form.category = "plat"
  }

  // Start polling on mount, cleanup on unmount
  onMount(() => {
    realtime.connect()
    return () => realtime.disconnect()
  })

  // Group items by category
  const itemsByCategory = $derived.by(() => {
    const groups = new Map<ItemCategory, Item[]>()
    CATEGORY_ORDER.forEach((cat) => groups.set(cat, []))
    items.forEach((item) => {
      const cat = item.category as ItemCategory
      if (groups.has(cat)) {
        groups.get(cat)!.push(item)
      }
    })
    return groups
  })

  // Group items by participant
  const itemsByParticipant = $derived.by(() => {
    const groups = new Map<string, Item[]>()
    items.forEach((item) => {
      if (!groups.has(item.participant)) {
        groups.set(item.participant, [])
      }
      groups.get(item.participant)!.push(item)
    })
    return groups
  })

  // Get participant name by ID
  function getParticipantName(participantId: string): string {
    return participants.find((p) => p.id === participantId)?.name || "Inconnu"
  }

  // Format date
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Share event
  async function shareEvent() {
    const shareUrl = `${window.location.origin}/e/${data.event.share_code}`
    const shareText = `Rejoignez "${data.event.name}" sur Popote !\n${shareUrl}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: data.event.name,
          text: shareText,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert("Lien copié dans le presse-papiers !")
      }
    } catch (err) {
      log("error", "Failed to share", { error: String(err) })
    }
  }
</script>

<div class="min-h-screen p-4">
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Event Header -->
    <Card>
      <CardHeader>
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <CardTitle class="text-2xl">{data.event.name}</CardTitle>
            <CardDescription>
              {formatDate(data.event.date)}
              {#if data.event.location}
                <br />📍 {data.event.location}
              {/if}
            </CardDescription>
          </div>
          <div class="flex gap-2">
            <Badge variant="secondary">
              {data.event.share_code}
            </Badge>
            <Button variant="outline" size="sm" onclick={shareEvent}>
              Partager
            </Button>
          </div>
        </div>
        {#if data.event.description}
          <p class="text-sm">{data.event.description}</p>
        {/if}
      </CardHeader>
    </Card>

    <!-- View Toggle + Add Button -->
    <div class="flex items-center justify-between">
      <ToggleGroup bind:value={viewMode} type="single">
        <ToggleGroupItem value="category">Par catégorie</ToggleGroupItem>
        <ToggleGroupItem value="person">Par personne</ToggleGroupItem>
      </ToggleGroup>

      <Dialog bind:open={dialogOpen}>
        <DialogTrigger>Ajouter un item</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qu'apportez-vous ?</DialogTitle>
          </DialogHeader>
          <form method="POST" action="?/addItem" use:enhance class="space-y-4">
            <div class="space-y-2">
              <Label for="name">Nom de l'item *</Label>
              <Input
                id="name"
                name="name"
                bind:value={$form.name}
                placeholder="Tiramisu maison"
                required
                aria-invalid={$errors.name ? "true" : undefined}
              />
              {#if $errors.name}
                <p class="text-sm text-destructive">{$errors.name}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="category">Catégorie *</Label>
              <Select name="category" bind:value={$form.category} type="single">
                <SelectTrigger>
                  {$form.category}
                </SelectTrigger>
                <SelectContent>
                  {#each CATEGORY_ORDER as cat}
                    <SelectItem value={cat} label={CATEGORIES[cat].label}>
                      {CATEGORIES[cat].emoji}
                      {CATEGORIES[cat].label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if $errors.category}
                <p class="text-sm text-destructive">{$errors.category}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="quantity">Quantité</Label>
              <Input
                id="quantity"
                name="quantity"
                bind:value={$form.quantity}
                placeholder="Pour 8 personnes"
              />
            </div>

            {#if $message}
              <p class="text-sm text-destructive">{$message}</p>
            {/if}

            <div class="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onclick={() => (dialogOpen = false)}
                class="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" class="flex-1" disabled={$delayed}>
                {$delayed ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Items List -->
    {#if viewMode === "category"}
      <!-- By Category -->
      <div class="space-y-4">
        {#each CATEGORY_ORDER as category}
          {@const categoryItems = itemsByCategory.get(category) || []}
          {#if categoryItems.length > 0}
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">
                  {CATEGORIES[category].emoji}
                  {CATEGORIES[category].label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-2">
                  {#each categoryItems as item}
                    <div
                      class="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div class="flex-1">
                        <p class="font-medium">{item.name}</p>
                        <p class="text-sm text-muted-foreground">
                          Par {getParticipantName(item.participant)}
                          {#if item.quantity}
                            • {item.quantity}
                          {/if}
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </CardContent>
            </Card>
          {/if}
        {/each}
      </div>
    {:else}
      <!-- By Person -->
      <div class="space-y-4">
        {#each participants as participant}
          {@const personItems = itemsByParticipant.get(participant.id) || []}
          {#if personItems.length > 0}
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">
                  {participant.name}
                  {#if participant.is_host}
                    <Badge variant="secondary" class="ml-2">Hôte</Badge>
                  {/if}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-2">
                  {#each personItems as item}
                    <div
                      class="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div class="flex-1">
                        <p class="font-medium">
                          {CATEGORIES[item.category as ItemCategory].emoji}
                          {item.name}
                        </p>
                        <p class="text-sm text-muted-foreground">
                          {CATEGORIES[item.category as ItemCategory].label}
                          {#if item.quantity}
                            • {item.quantity}
                          {/if}
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </CardContent>
            </Card>
          {/if}
        {/each}
      </div>
    {/if}

    {#if items.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <p class="text-muted-foreground">
            Aucun item pour le moment.<br />
            Soyez le premier à ajouter quelque chose !
          </p>
        </CardContent>
      </Card>
    {/if}
  </div>
</div>
