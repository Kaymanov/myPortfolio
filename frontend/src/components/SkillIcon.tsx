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
  SiApache,
  SiMysql,
  SiMariadb,
  SiUbuntu,
  SiDebian,
  SiCentos,
  SiRedhat,
  SiElasticsearch,
  SiKibana,
  SiVirtualbox,
  SiWireguard,
  SiOpenvpn,
  SiPowershell,
  SiGitlab,
  SiGithub,
  SiJenkins,
  SiTerraform,
  SiVault,
  SiRabbitmq,
  SiApachekafka,
  SiMinecraft,
} from "react-icons/si";
import {
  FaServer,
  FaNetworkWired,
  FaShieldAlt,
  FaDatabase,
  FaCloud,
  FaTerminal,
  FaWindows,
  FaLinux,
  FaDocker,
  FaPython,
} from "react-icons/fa";
import {
  AiOutlineWindows,
  AiOutlineCloud,
  AiOutlineDatabase,
  AiOutlineLock,
  AiOutlineApi,
} from "react-icons/ai";

/**
 * Маппинг строки icon_name (из Django-админки) → React-иконка.
 *
 * В админке можно указать:
 * 1. Короткий slug: "docker", "linux", "react", "windows"
 * 2. Полное имя компонента react-icons: "SiDocker", "FaWindows", "AiOutlineWindows"
 *
 * Если имя не найдено — иконка не рендерится (graceful fallback).
 */
const ICON_MAP: Record<string, IconType> = {
  // --- Simple Icons (бренды) ---
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
  apache: SiApache,
  mysql: SiMysql,
  mariadb: SiMariadb,
  ubuntu: SiUbuntu,
  debian: SiDebian,
  centos: SiCentos,
  redhat: SiRedhat,
  elasticsearch: SiElasticsearch,
  kibana: SiKibana,
  virtualbox: SiVirtualbox,
  wireguard: SiWireguard,
  openvpn: SiOpenvpn,
  powershell: SiPowershell,
  gitlab: SiGitlab,
  github: SiGithub,
  jenkins: SiJenkins,
  terraform: SiTerraform,
  vault: SiVault,
  rabbitmq: SiRabbitmq,
  kafka: SiApachekafka,

  // --- Font Awesome (generic) ---
  server: FaServer,
  network: FaNetworkWired,
  security: FaShieldAlt,
  database: FaDatabase,
  cloud: FaCloud,
  terminal: FaTerminal,

  // --- Полные имена компонентов (case-sensitive) ---
  // Simple Icons
  SiDocker: SiDocker,
  SiLinux: SiLinux,
  SiReact: SiReact,
  SiPython: SiPython,
  SiDjango: SiDjango,
  SiNginx: SiNginx,
  SiPostgresql: SiPostgresql,
  SiGit: SiGit,
  SiTypescript: SiTypescript,
  SiJavascript: SiJavascript,
  SiNextdotjs: SiNextdotjs,
  SiTailwindcss: SiTailwindcss,
  SiRedis: SiRedis,
  SiProxmox: SiProxmox,
  SiAnsible: SiAnsible,
  SiGrafana: SiGrafana,
  SiPrometheus: SiPrometheus,
  SiKubernetes: SiKubernetes,
  SiVmware: SiVmware,
  SiCisco: SiCisco,
  SiWireshark: SiWireshark,
  SiCloudflare: SiCloudflare,
  SiGnubash: SiGnubash,
  SiWindows: SiWindows,
  SiHtml5: SiHtml5,
  SiCss3: SiCss3,
  SiNodedotjs: SiNodedotjs,
  SiMongodb: SiMongodb,
  SiApache: SiApache,
  SiMysql: SiMysql,
  SiMariadb: SiMariadb,
  SiUbuntu: SiUbuntu,
  SiDebian: SiDebian,
  SiCentos: SiCentos,
  SiRedhat: SiRedhat,
  SiElasticsearch: SiElasticsearch,
  SiKibana: SiKibana,
  SiVirtualbox: SiVirtualbox,
  SiWireguard: SiWireguard,
  SiOpenvpn: SiOpenvpn,
  SiPowershell: SiPowershell,
  SiGitlab: SiGitlab,
  SiGithub: SiGithub,
  SiJenkins: SiJenkins,
  SiTerraform: SiTerraform,
  SiVault: SiVault,
  SiRabbitmq: SiRabbitmq,
  SiApachekafka: SiApachekafka,
  SiMinecraft: SiMinecraft,

  // Font Awesome
  FaServer: FaServer,
  FaNetworkWired: FaNetworkWired,
  FaShieldAlt: FaShieldAlt,
  FaDatabase: FaDatabase,
  FaCloud: FaCloud,
  FaTerminal: FaTerminal,
  FaWindows: FaWindows,
  FaLinux: FaLinux,
  FaDocker: FaDocker,
  FaPython: FaPython,

  // Ant Design Icons
  AiOutlineWindows: AiOutlineWindows,
  AiOutlineCloud: AiOutlineCloud,
  AiOutlineDatabase: AiOutlineDatabase,
  AiOutlineLock: AiOutlineLock,
  AiOutlineApi: AiOutlineApi,
};

interface SkillIconProps {
  name?: string;
  className?: string;
}

export const SkillIcon = ({ name, className = "" }: SkillIconProps) => {
  if (!name) return null;

  // Сначала ищем по точному имени (полные имена react-icons — case-sensitive)
  let Icon = ICON_MAP[name.trim()];
  // Если не нашли — ищем по lowercase slug
  if (!Icon) {
    Icon = ICON_MAP[name.toLowerCase().trim()];
  }
  if (!Icon) return null;

  return <Icon className={`inline-block ${className}`} aria-hidden="true" />;
};
