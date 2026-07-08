"use client";

import { IconType } from "react-icons";
import {
  SiDocker,
  SiLinux,
  SiReact,
  SiPython,
  SiDjango,
  SiNginx,
  SiPostgresql,
  SiGit,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiTailwindcss,
  SiRedis,
  SiProxmox,
  SiAnsible,
  SiGrafana,
  SiPrometheus,
  SiKubernetes,
  SiVmware,
  SiCisco,
  SiWireshark,
  SiCloudflare,
  SiGnubash,
  SiWindows,
  SiHtml5,
  SiCss3,
  SiNodedotjs,
  SiMongodb,
} from "react-icons/si";
import {
  FaServer,
  FaNetworkWired,
  FaShieldAlt,
  FaDatabase,
  FaCloud,
  FaTerminal,
} from "react-icons/fa";

/**
 * Маппинг строки icon_name (из Django-админки) → React-иконка.
 *
 * В админке пишешь slug (например "docker", "linux", "react"),
 * компонент рендерит соответствующую SVG-иконку.
 *
 * Если slug не найден — иконка не рендерится (graceful fallback).
 */
const ICON_MAP: Record<string, IconType> = {
  docker: SiDocker,
  linux: SiLinux,
  react: SiReact,
  python: SiPython,
  django: SiDjango,
  nginx: SiNginx,
  postgresql: SiPostgresql,
  postgres: SiPostgresql,
  git: SiGit,
  typescript: SiTypescript,
  javascript: SiJavascript,
  nextjs: SiNextdotjs,
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  redis: SiRedis,
  proxmox: SiProxmox,
  ansible: SiAnsible,
  grafana: SiGrafana,
  prometheus: SiPrometheus,
  kubernetes: SiKubernetes,
  vmware: SiVmware,
  cisco: SiCisco,
  wireshark: SiWireshark,
  cloudflare: SiCloudflare,
  bash: SiGnubash,
  windows: SiWindows,
  html: SiHtml5,
  css: SiCss3,
  nodejs: SiNodedotjs,
  mongodb: SiMongodb,
  // Generic / fallback категории
  server: FaServer,
  network: FaNetworkWired,
  security: FaShieldAlt,
  database: FaDatabase,
  cloud: FaCloud,
  terminal: FaTerminal,
};

interface SkillIconProps {
  name?: string;
  className?: string;
}

export const SkillIcon = ({ name, className = "" }: SkillIconProps) => {
  if (!name) return null;

  const Icon = ICON_MAP[name.toLowerCase().trim()];
  if (!Icon) return null;

  return <Icon className={`inline-block ${className}`} aria-hidden="true" />;
};
