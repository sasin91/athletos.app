variable "hcloud_token" {
  description = "Hetzner Cloud API token. Set it as a sensitive HCP workspace variable, or export TF_VAR_hcloud_token; never write it into a .tfvars file that git can see."
  type        = string
  sensitive   = true
}

variable "server_name" {
  description = "Name of the server in the Hetzner console, and the prefix for the firewall and key."
  type        = string
  default     = "athletos"
}

variable "server_type" {
  description = "CX22 — 2 vCPU, 4 GB, 40 GB. Sized against measurement, not guesswork: the API holds 29.8 MB RSS under load, Node SSR 40–60 MB per jail, Caddy 20 MB, Postgres 200–300 MB, base system 150 MB, and ZFS ARC is capped at 512 MB in /boot/loader.conf. About 1.1 GB in use against 4 GB available."
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "hel1 — Helsinki. Closest Hetzner region to the athletes this serves, and inside the EU for ADR-0011's data residency."
  type        = string
  default     = "hel1"
}

variable "ssh_public_key" {
  description = "The public half of the key that will open the box. Ed25519."
  type        = string
}

variable "ssh_source_ips" {
  description = "CIDRs allowed to reach port 22. Narrow this to a known address if there is one; a home connection that changes weekly is worse than useless as a control, because the temptation is then to widen it in a hurry from a phone."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "bootstrap_image" {
  description = "The Linux image Hetzner installs so that the API accepts the request. It is overwritten by bsdinstall and never booted again in anger."
  type        = string
  default     = "debian-13"
}

variable "install_iso" {
  description = "Set to a FreeBSD installer ISO name (e.g. \"FreeBSD-14.3-RELEASE-amd64-dvd1.iso\") for the one-time install, then set back to null. Leaving it set means the machine boots the installer on every reboot."
  type        = string
  default     = null
}
