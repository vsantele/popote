<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { superForm } from "sveltekit-superforms/client";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const {
    form: signUpForm,
    errors: signUpErrors,
    message: signUpMessage,
    enhance: signUpEnhance,
    delayed: signUpDelayed,
  } = superForm(data.signUpForm, {
    id: "signUp",
    resetForm: false,
  });

  const {
    form: signInForm,
    errors: signInErrors,
    message: signInMessage,
    enhance: signInEnhance,
    delayed: signInDelayed,
  } = superForm(data.signInForm, {
    id: "signIn",
    resetForm: false,
  });

  const isLoggedIn = $derived(!!data.user && !data.user.isAnonymous);
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-bold">👤 Compte</h1>
      <p class="text-muted-foreground">
        {#if isLoggedIn}
          Connecté en tant que {data.user?.email}
        {:else}
          Créez un compte pour retrouver vos soirées sur tous vos appareils
        {/if}
      </p>
    </div>

    {#if isLoggedIn}
      <Card>
        <CardHeader>
          <CardTitle>Mon compte</CardTitle>
          <CardDescription>
            {data.user?.name}<br />
            <span class="text-xs">{data.user?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" action="?/signOut">
            <Button type="submit" variant="outline" class="w-full">
              Se déconnecter
            </Button>
          </form>
        </CardContent>
      </Card>
    {:else}
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>
            Vos soirées en cours seront automatiquement liées à votre nouveau
            compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="POST"
            action="?/signUp"
            use:signUpEnhance
            class="space-y-4"
          >
            <div class="space-y-2">
              <Label for="signup-name">Votre nom *</Label>
              <Input
                id="signup-name"
                name="name"
                bind:value={$signUpForm.name}
                placeholder="Votre prénom"
                required
                aria-invalid={$signUpErrors.name ? "true" : undefined}
              />
              {#if $signUpErrors.name}
                <p class="text-sm text-destructive">{$signUpErrors.name}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="signup-email">Email *</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                bind:value={$signUpForm.email}
                placeholder="vous@exemple.fr"
                required
                aria-invalid={$signUpErrors.email ? "true" : undefined}
              />
              {#if $signUpErrors.email}
                <p class="text-sm text-destructive">{$signUpErrors.email}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="signup-password">Mot de passe *</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                bind:value={$signUpForm.password}
                placeholder="8 caractères minimum"
                required
                aria-invalid={$signUpErrors.password ? "true" : undefined}
              />
              {#if $signUpErrors.password}
                <p class="text-sm text-destructive">
                  {$signUpErrors.password}
                </p>
              {/if}
            </div>

            {#if $signUpMessage}
              <p class="text-sm text-destructive">{$signUpMessage}</p>
            {/if}

            <Button type="submit" class="w-full" disabled={$signUpDelayed}>
              {$signUpDelayed ? "Création..." : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>
            J'ai déjà un compte sur un autre appareil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="POST"
            action="?/signIn"
            use:signInEnhance
            class="space-y-4"
          >
            <div class="space-y-2">
              <Label for="signin-email">Email</Label>
              <Input
                id="signin-email"
                name="email"
                type="email"
                bind:value={$signInForm.email}
                placeholder="vous@exemple.fr"
                required
                aria-invalid={$signInErrors.email ? "true" : undefined}
              />
              {#if $signInErrors.email}
                <p class="text-sm text-destructive">{$signInErrors.email}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="signin-password">Mot de passe</Label>
              <Input
                id="signin-password"
                name="password"
                type="password"
                bind:value={$signInForm.password}
                required
                aria-invalid={$signInErrors.password ? "true" : undefined}
              />
              {#if $signInErrors.password}
                <p class="text-sm text-destructive">
                  {$signInErrors.password}
                </p>
              {/if}
            </div>

            {#if $signInMessage}
              <p class="text-sm text-destructive">{$signInMessage}</p>
            {/if}

            <Button
              type="submit"
              variant="outline"
              class="w-full"
              disabled={$signInDelayed}
            >
              {$signInDelayed ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    {/if}

    <div class="text-center">
      <Button href="/" variant="ghost" size="sm">Retour à l'accueil</Button>
    </div>

    {#if data.user}
      <div class="pt-8 text-center">
        <details class="text-xs text-muted-foreground">
          <summary class="cursor-pointer hover:underline">
            Informations avancées
          </summary>
          <div class="mt-2 p-2 bg-muted rounded break-all font-mono space-y-1">
            <div>ID utilisateur : {data.user.id}</div>
            <div>Anonyme : {data.user.isAnonymous ? "oui" : "non"}</div>
          </div>
        </details>
      </div>
    {/if}
  </div>
</div>
