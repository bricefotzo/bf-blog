// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';

// https://astro.build/config
export default defineConfig({
	site: 'https://bricefotzo.dev',
	integrations: [
		starlight({
			title: 'Brice Fotzo',
			description: 'Data & Cloud Native Engineer - Portfolio, Projects, Blog',
			defaultLocale: 'fr',
			social: [
				{
					icon: 'linkedin',
					label: 'LinkedIn',
					href: 'https://www.linkedin.com/in/bricefotzo/',
				},
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/bricefotzo',
				},
			],
			customCss: ['/src/styles/custom.css'],
			plugins: [
				starlightBlog({
					title: 'Blog',
					postCount: 10,
					recentPostCount: 5,
					authors: {
						brice: {
							name: 'Brice Fotzo',
							title: 'Data & Cloud Native Engineer',
							picture: '/avatar.png',
							url: 'https://www.linkedin.com/in/bricefotzo/',
						},
					},
				}),
			],
			sidebar: [
				{
					label: 'Portfolio',
					items: [
						{ label: 'Projets', slug: 'projects' },
						{ label: 'Accomplissements', slug: 'accomplishments' },
						{ label: 'Liens', slug: 'links' },
					],
				},
				{
					label: 'A propos',
					items: [{ label: 'Qui suis-je ?', slug: 'about' }],
				},
			],
			components: {
				Head: './src/components/Head.astro',
				Sidebar: './src/components/Sidebar.astro',
			},
		}),
	],
});
