import { GITHUB_TOKEN, GIST_FILE_NAME } from "./config";
import { createEmptyUserData, type UserData } from "./userStore";

export async function getGist() {
  const res = await fetch("https://api.github.com/gists", {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `GitHub Gist request failed (${res.status}): ${data.message ?? JSON.stringify(data)}`,
    );
  }

  const gist = data.find((gist: any) => GIST_FILE_NAME in gist.files);

  if (!gist) {
    return null;
  }

  const fullRes = await fetch(`https://api.github.com/gists/${gist.id}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  const fullGist = await fullRes.json();

  if (!fullRes.ok) {
    throw new Error(
      `Failed to fetch gist (${fullRes.status}): ${fullGist.message ?? JSON.stringify(fullGist)}`,
    );
  }

  return fullGist;
}

export async function loadFromGist(): Promise<UserData> {
  const gist = await getGist();

  if (!gist) {
    const emptyData: UserData = createEmptyUserData();

    await createGist(emptyData);
    return emptyData;
  }

  const file = gist.files[GIST_FILE_NAME];

  if (!file) {
    throw new Error(`Missing ${GIST_FILE_NAME} in gist`);
  }

  return JSON.parse(file.content) as UserData;
}

export async function saveToGist(data: unknown) {
  const gist = await getGist();

  if (!gist) {
    return createGist(data);
  }

  const res = await fetch(`https://api.github.com/gists/${gist.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: {
        [GIST_FILE_NAME]: {
          content: JSON.stringify(data),
        },
      },
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      `Failed to save gist (${res.status}): ${error.message ?? JSON.stringify(error)}`,
    );
  }
}

async function createGist(data: unknown) {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: "Warframe Tracker Save",
      public: false,
      files: {
        [GIST_FILE_NAME]: {
          content: JSON.stringify(data),
        },
      },
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      `Failed to create gist (${res.status}): ${error.message ?? JSON.stringify(error)}`,
    );
  }
}