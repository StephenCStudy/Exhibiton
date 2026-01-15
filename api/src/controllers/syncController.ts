import { Request, Response } from "express";
import { Storage } from "megajs";
import { Video, Comic } from "../models/index";

// Helper function to delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to get link with retry
async function getLinkWithRetry(
  item: any,
  maxRetries = 3,
  delayMs = 2000
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const link = await item.link();
      return link;
    } catch (err: any) {
      if (i < maxRetries - 1) {
        await delay(delayMs * (i + 1));
      } else {
        console.error(
          `Failed to get link for ${item.name} after ${maxRetries} retries`
        );
        return null;
      }
    }
  }
  return null;
}

// Sync videos from Mega Exhibition folder
export const syncVideosFromMega = async (req: Request, res: Response) => {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    return res.status(500).json({
      success: false,
      message: "Mega credentials not configured on server",
    });
  }

  let storage: any = null;

  try {
    // Connect to Mega
    storage = await new Storage({
      email,
      password,
      keepalive: false,
    }).ready;

    // Find Exhibition folder (videos)
    const videoFolder = storage.root.children?.find(
      (f: any) => f.name === "Exhibition" && f.directory
    );

    if (!videoFolder) {
      storage.close();
      return res.status(404).json({
        success: false,
        message: "Exhibition folder not found in Mega",
        availableFolders: storage.root.children?.map((f: any) => f.name) || [],
      });
    }

    const videos: {
      title: string;
      thumbnail: string;
      megaVideoLink: string;
    }[] = [];

    let index = 0;
    const children = videoFolder.children || [];

    for (const item of children) {
      if (item.directory) continue; // Skip folders

      try {
        // Add delay to avoid rate limiting
        if (index > 0) {
          await delay(1000);
        }

        const link = await getLinkWithRetry(item);
        if (!link) continue;

        index++;
        const fileName = item.name;
        const titleWithoutExt = fileName.replace(/\.[^/.]+$/, "");

        videos.push({
          title: titleWithoutExt,
          thumbnail: `https://picsum.photos/seed/video${index}/640/360`,
          megaVideoLink: link,
        });
      } catch (err) {
        console.error(`Error processing video ${item.name}:`, err);
      }
    }

    // Clear existing videos and insert new ones
    await Video.deleteMany({});
    const insertedVideos = await Video.insertMany(videos);

    storage.close();

    res.status(200).json({
      success: true,
      message: `Synced ${insertedVideos.length} videos from Mega`,
      data: {
        total: insertedVideos.length,
        videos: insertedVideos.slice(0, 10), // Return first 10 as preview
      },
    });
  } catch (error: any) {
    if (storage) storage.close();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync videos from Mega",
    });
  }
};

// Sync comics from Mega Comic folder
export const syncComicsFromMega = async (req: Request, res: Response) => {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    return res.status(500).json({
      success: false,
      message: "Mega credentials not configured on server",
    });
  }

  let storage: any = null;

  try {
    // Connect to Mega
    storage = await new Storage({
      email,
      password,
      keepalive: false,
    }).ready;

    // Find Comic folder
    const comicFolder = storage.root.children?.find(
      (f: any) => f.name === "Comic" && f.directory
    );

    if (!comicFolder) {
      storage.close();
      return res.status(404).json({
        success: false,
        message: "Comic folder not found in Mega",
        availableFolders: storage.root.children?.map((f: any) => f.name) || [],
      });
    }

    const comics: {
      name: string;
      coverImage: string;
      megaFolderLink: string;
    }[] = [];

    let index = 0;
    const children = comicFolder.children || [];

    for (const folder of children) {
      if (!folder.directory) continue; // Skip files

      try {
        // Add delay to avoid rate limiting
        if (index > 0) {
          await delay(1500);
        }

        const link = await getLinkWithRetry(folder);
        if (!link) continue;

        index++;

        comics.push({
          name: folder.name,
          coverImage: `https://picsum.photos/seed/comic${index}/400/600`,
          megaFolderLink: link,
        });
      } catch (err) {
        console.error(`Error processing comic ${folder.name}:`, err);
      }
    }

    // Clear existing comics and insert new ones
    await Comic.deleteMany({});
    const insertedComics = await Comic.insertMany(comics);

    storage.close();

    res.status(200).json({
      success: true,
      message: `Synced ${insertedComics.length} comics from Mega`,
      data: {
        total: insertedComics.length,
        comics: insertedComics,
      },
    });
  } catch (error: any) {
    if (storage) storage.close();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync comics from Mega",
    });
  }
};

// Get Mega folder structure (preview without syncing)
export const getMegaFolderStructure = async (req: Request, res: Response) => {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    return res.status(500).json({
      success: false,
      message: "Mega credentials not configured on server",
    });
  }

  let storage: any = null;

  try {
    storage = await new Storage({
      email,
      password,
      keepalive: false,
    }).ready;

    const structure = {
      rootFolders:
        storage.root.children?.map((f: any) => ({
          name: f.name,
          isFolder: f.directory,
          childCount: f.children?.length || 0,
        })) || [],
    };

    // Get Exhibition (videos) folder info
    const videoFolder = storage.root.children?.find(
      (f: any) => f.name === "Exhibition" && f.directory
    );

    // Get Comic folder info
    const comicFolder = storage.root.children?.find(
      (f: any) => f.name === "Comic" && f.directory
    );

    storage.close();

    res.status(200).json({
      success: true,
      data: {
        ...structure,
        videoFolder: videoFolder
          ? {
              name: videoFolder.name,
              fileCount:
                videoFolder.children?.filter((c: any) => !c.directory).length ||
                0,
            }
          : null,
        comicFolder: comicFolder
          ? {
              name: comicFolder.name,
              folderCount:
                comicFolder.children?.filter((c: any) => c.directory).length ||
                0,
              folders:
                comicFolder.children
                  ?.filter((c: any) => c.directory)
                  .map((f: any) => f.name) || [],
            }
          : null,
      },
    });
  } catch (error: any) {
    if (storage) storage.close();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get Mega folder structure",
    });
  }
};
