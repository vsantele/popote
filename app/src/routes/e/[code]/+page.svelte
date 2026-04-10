<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import {
    ToggleGroup,
    ToggleGroupItem,
  } from "$lib/components/ui/toggle-group";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import {
    CATEGORIES,
    CATEGORY_ORDER,
    type Item,
    type ItemCategory,
  } from "$lib/types/index";
  import { log } from "$lib/utils/logger";
  import { superForm } from "sveltekit-superforms/client";
  import { invalidateAll, goto } from "$app/navigation";
  import { page } from "$app/state";
  import { RefreshCw } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  // Derive viewMode from URL (single source of truth)
  let viewMode = $derived<"category" | "person">(
    page.url.searchParams.get("view") === "person" ? "person" : "category"
  );

  // Update URL through event handler (not effect)
  function setViewMode(newMode: "category" | "person") {
    const url = new URL(page.url);
    if (newMode === "category") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", newMode);
    }
    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  let dialogOpen = $state(false);
  let isRefreshing = $state(false);

  // Use data directly from server load (no polling)
  let items = $derived(data.items);
  let participants = $derived(data.participants);

  // Setup Superform for adding items
  const { form, errors, enhance, delayed, message } = superForm(data.form, {
    resetForm: true,
    onUpdated: async ({ form }) => {
      if (form.valid) {
        dialogOpen = false;
        await invalidateAll();
      }
    },
  });

  // Set default category to 'plat' if not set
  if (!$form.category) {
    $form.category = "plat";
  }

  // Manual refresh function
  async function handleRefresh() {
    isRefreshing = true;
    try {
      await invalidateAll();
    } finally {
      isRefreshing = false;
    }
  }

  // Pull-to-refresh support (mobile gesture)
  let touchStartY = 0;
  let isPulling = $state(false);
  let pullDistance = $state(0);

  function handleTouchStart(e: TouchEvent) {
    if (window.scrollY === 0) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (touchStartY === 0) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY;

    if (distance > 0 && window.scrollY === 0) {
      isPulling = true;
      pullDistance = Math.min(distance, 80);

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }

  async function handleTouchEnd() {
    if (isPulling && pullDistance > 60) {
      // Trigger refresh if pulled far enough
      await handleRefresh();
    }

    touchStartY = 0;
    isPulling = false;
    pullDistance = 0;
  }

  // Group items by category
  const itemsByCategory = $derived.by(() => {
    const groups = new Map<ItemCategory, Item[]>();
    CATEGORY_ORDER.forEach((cat) => groups.set(cat, []));
    items.forEach((item) => {
      const cat = item.category as ItemCategory;
      if (groups.has(cat)) {
        groups.get(cat)!.push(item);
      }
    });
    return groups;
  });

  // Group items by participant
  const itemsByParticipant = $derived.by(() => {
    const groups = new Map<string, Item[]>();
    items.forEach((item) => {
      if (!groups.has(item.participant)) {
        groups.set(item.participant, []);
      }
      groups.get(item.participant)!.push(item);
    });
    return groups;
  });

  // Get participant name by ID
  function getParticipantName(participantId: string): string {
    return participants.find((p) => p.id === participantId)?.name || "Inconnu";
  }

  // Format date
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  // Share event
  async function shareEvent() {
    const shareUrl = `${window.location.origin}/e/${data.event.share_code}`;
    const shareText = `Rejoignez "${data.event.name}" sur Popote !\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: data.event.name,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Lien copié dans le presse-papiers !");
      }
    } catch (err) {
      log("error", "Failed to share", { error: String(err) });
    }
  }
</script>

<div
  class="min-h-screen p-4"
  role="main"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <!-- Pull-to-refresh indicator -->
  {#if isPulling}
    <div
      class="fixed top-0 left-0 right-0 flex items-center justify-center transition-all"
      style="height: {pullDistance}px; opacity: {pullDistance / 80}"
    >
      <RefreshCw class={pullDistance > 60 ? "animate-spin" : ""} />
    </div>
  {/if}

  <div
    class="max-w-4xl mx-auto space-y-6"
    style="padding-top: {isPulling ? pullDistance : 0}px"
  >
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
    <div class="flex items-center justify-between gap-2">
      <ToggleGroup
        value={viewMode}
        onvaluechange={(value) => value && setViewMode(value as "category" | "person")}
        type="single"
      >
        <ToggleGroupItem value="category">Par catégorie</ToggleGroupItem>
        <ToggleGroupItem value="person">Par personne</ToggleGroupItem>
      </ToggleGroup>

      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            class={isRefreshing ? "animate-spin mr-2" : "mr-2"}
            size={16}
          />
          Actualiser
        </Button>

        <Dialog bind:open={dialogOpen}>
          <DialogTrigger>Ajouter un item</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Qu'apportez-vous ?</DialogTitle>
            </DialogHeader>
            <form
              method="POST"
              action="?/addItem"
              use:enhance
              class="space-y-4"
            >
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
                <Select
                  name="category"
                  bind:value={$form.category}
                  type="single"
                >
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
