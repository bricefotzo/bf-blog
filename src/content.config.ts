import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';
import { z } from 'astro/zod';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: (context) => {
				return blogSchema(context).extend({
					linkedinUrl: z.string().url().optional(),
					externalUrl: z.string().url().optional(),
				});
			},
		}),
	}),
};
