import React from "react";
import { Link } from "react-router-dom";
import { Brain } from 'lucide-react';
import { House } from 'lucide-react';
import { BookA } from 'lucide-react';
import { Briefcase } from 'lucide-react';

const links = [
	{
		to: "/",
		label: "Home",
		icon: (
			<House />
		)
	},
	{
		to: "/courses",
		label: "Courses",
		icon: (
			<BookA />
		)
	},
	{
		to: "/ai-chat",
		label: "AI Chat",
		icon: (
			<Brain />
		)
	},
	{
		to: "/jobs/market",
		label: "Jobs",
		icon: (
			<Briefcase />
		)
	},
];

const NavLinks: React.FC<{ className?: string }> = ({ className = "" }) => (
	<ul className={`hidden md:flex items-center space-x-12 text-xs font-semibold ${className}`}>
		{links.map((l) => (
			<li key={l.to}>
				<Link
					className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors"
					to={l.to}
					title={l.label}
				>
					{l.icon}
					<span>{l.label}</span>
				</Link>
			</li>
		))}
	</ul>
);

export default NavLinks;
