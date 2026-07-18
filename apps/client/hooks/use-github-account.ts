import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export function useGithubAccount() {
  const [githubLinked, setGithubLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkGithubLinked = () => {
    authClient
      .listAccounts()
      .then((accounts) => {
        const hasGithub = accounts.data?.some((a) => a.providerId === "github");
        setGithubLinked(!!hasGithub);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    checkGithubLinked();
  }, []);

  const connectGithub = async () => {
    await authClient.linkSocial({
      provider: "github",
    });
    checkGithubLinked();
  };

  const unlinkGithub = async () => {
    if (!githubLinked) return;
    setIsLoading(true);
    await authClient.unlinkAccount({
      providerId: "github",
    });
    checkGithubLinked();
    setIsLoading(false);
  };

  return { githubLinked, isLoading, connectGithub, unlinkGithub };
}
