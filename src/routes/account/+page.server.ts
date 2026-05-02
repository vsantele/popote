import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/server";
import { APIError } from "better-auth/api";

const signUpSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  email: z.email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
});

const signInSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const load: PageServerLoad = async ({ locals }) => {
  const signUpForm = await superValidate(zod4(signUpSchema));
  const signInForm = await superValidate(zod4(signInSchema));

  if (locals.user && !locals.user.isAnonymous) {
    signUpForm.data.name = locals.user.name;
    signUpForm.data.email = locals.user.email ?? "";
  } else if (locals.user?.name) {
    signUpForm.data.name = locals.user.name;
  }

  return {
    user: locals.user
      ? {
          id: locals.user.id,
          name: locals.user.name,
          email: locals.user.email,
          isAnonymous: locals.user.isAnonymous,
        }
      : null,
    signUpForm,
    signInForm,
  };
};

export const actions: Actions = {
  signUp: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(signUpSchema));
    if (!form.valid) return fail(400, { form, error: null });

    try {
      // The anonymous plugin's onLinkAccount callback will migrate the
      // anonymous user's events/participants to this new user.
      await locals.auth.api.signUpEmail({
        headers: request.headers,
        body: {
          name: form.data.name,
          email: form.data.email,
          password: form.data.password,
        },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return fail(400, { form, error: err.message });
      }
      console.error("Sign-up failed:", err);
      return fail(500, {
        form,
        error: "Erreur lors de la création du compte.",
      });
    }

    throw redirect(303, "/");
  },

  signIn: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(signInSchema));
    if (!form.valid) return fail(400, { form, error: null });

    try {
      await locals.auth.api.signInEmail({
        headers: request.headers,
        body: {
          email: form.data.email,
          password: form.data.password,
        },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return fail(400, { form, error: err.message });
      }
      console.error("Sign-in failed:", err);
      return fail(500, { form, error: "Erreur lors de la connexion." });
    }

    throw redirect(303, "/");
  },

  signOut: async ({ request, locals }) => {
    try {
      await locals.auth.api.signOut({ headers: request.headers });
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
    throw redirect(303, "/");
  },
};
