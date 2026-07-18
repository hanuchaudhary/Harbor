import { useEffect, useState } from "react";
import { useGithubAccount } from "./use-github-account";
import axios from "axios";

interface GithubRepo {
  id: number;
  name: string;
  owner: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  createdAt: string;
}

export function useGithubRepos() {
  const { githubLinked } = useGithubAccount();
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!githubLinked) {
      setRepos([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    axios
      .get("/api/github/repos")
      .then((response) => {
        setRepos(response.data.repos || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch repos");
        setRepos([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [githubLinked]);

  return { repos, isLoading, error, githubLinked };
}
