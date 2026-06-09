// Lovable cloud auth is not used in local-first mode.

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      _provider: "google" | "apple" | "microsoft" | "lovable",
      _opts?: SignInOptions,
    ) => ({
      error: new Error("Cloud sign-in is not available in local mode. Open the workspace directly."),
    }),
  },
};
