import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";

dotenv.config();

const { PIPEDRIVE_API_KEY, PIPEDRIVE_COMPANY_DOMAIN } = process.env;

if (!PIPEDRIVE_API_KEY || !PIPEDRIVE_COMPANY_DOMAIN) {
  throw new Error("Missing Pipedrive environment variables");
}

const baseUrl = `https://${PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v2`;

const getValue = (obj: any, path: string): any =>
  path.split(".").reduce((value, key) => value?.[key], obj);

const request = async (
  url: string,
  options: RequestInit = {}
): Promise<any> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Pipedrive API ${response.status}: ${body}`);
  }

  return JSON.parse(body);
};

const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    // Build payload from mappings
    const payload: Record<string, any> = {};

    for (const { pipedriveKey, inputKey } of mappings) {
      const value = getValue(inputData, inputKey);

      if (value === undefined || value === null) continue;

      if (pipedriveKey === "email") {
        payload.emails = [{ value, primary: true }];
      } else if (pipedriveKey === "phone") {
        payload.phones = [{ value, primary: true }];
      } else {
        payload[pipedriveKey] = value;
      }
    }

    // Find the fiield mapped to Pipedrive name
    const nameMapping = mappings.find(
      (mapping) => mapping.pipedriveKey === "name"
    );

    if (!nameMapping) {
      throw new Error("Name mapping is missing");
    }

    const name = getValue(inputData, nameMapping.inputKey);

    if (!name) {
      throw new Error("Person name is missing");
    }

    // Search existing person
    const searchUrl =
      `${baseUrl}/persons/search` +
      `?api_token=${PIPEDRIVE_API_KEY}` +
      `&term=${encodeURIComponent(name)}` +
      `&fields=name` +
      `&exact_match=true`;

    const searchResult = await request(searchUrl);

    const existingPerson = searchResult.data?.items?.[0]?.item;

    // Update existing person
    if (existingPerson) {
      const result = await request(
        `${baseUrl}/persons/${existingPerson.id}?api_token=${PIPEDRIVE_API_KEY}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      return result.data;
    }

    // Create new person
    const result = await request(
      `${baseUrl}/persons?api_token=${PIPEDRIVE_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    return result.data;
  } catch (error) {
    console.error(
      "Pipedrive synchronization failed:",
      error instanceof Error ? error.message : error
    );

    throw error;
  }
};

syncPdPerson()
  .then((person) => console.log("Success:", person))
  .catch(() => {});