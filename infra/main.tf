// Terraform declares that a server exists, that a firewall stands in front of
// it, and that one SSH key opens it. That is the whole scope, on purpose.
//
// The reproducibility that matters is not here. It is in `bootstrap.sh`, which
// installs the packages, cuts the ZFS datasets, builds the jails and writes the
// configuration — the part that would actually have to be reconstructed from
// memory after a loss. Terraform's job is the three things that have identity
// outside the box: an IP address, a firewall, and a key.
//
// There is a second reason to keep it thin. FreeBSD is not a Hetzner image, so
// the operating system cannot be declared at all (see `install_iso` below). A
// configuration that pretended otherwise would be lying about the one step that
// is genuinely manual.

terraform {
  required_version = ">= 1.9.0"

  // HCP's free remote backend: versioned, locked, and not a file on a laptop.
  // Organization and workspace come from `TF_CLOUD_ORGANIZATION` and
  // `TF_WORKSPACE`, so this file names no account and can be validated with
  // `terraform init -backend=false` by anyone.
  cloud {}

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.53"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = var.ssh_public_key
}

// Belt to PF's braces. The cloud firewall sits outside the machine, so it holds
// even when the box is in rescue mode, mid-install, or has a broken `pf.conf` —
// which are exactly the moments a host firewall is not running.
//
// Postgres is absent from this list and always will be: it listens on a unix
// socket only, so there is no port to forget to close.
resource "hcloud_firewall" "web" {
  name = "${var.server_name}-web"

  rule {
    description = "SSH"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.ssh_source_ips
  }

  rule {
    description = "HTTP — ACME challenges and the redirect to HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  // Answering ping is not a security decision, it is a debugging one: the first
  // question when the site is down is whether the machine is there at all.
  rule {
    description = "ICMP"
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
}

// Hetzner has no FreeBSD image, so `image` here is a formality — whatever Linux
// it installs is overwritten within the hour by `bsdinstall` running off a
// mounted ISO. It cannot be omitted; the API requires it.
//
// The install is a documented one-time step (docs/DEPLOYMENT.md):
//
//   1. `install_iso = "FreeBSD-14.3-RELEASE-amd64-dvd1.iso"`, apply, and run
//      `bsdinstall` through Hetzner's web console — root-on-ZFS, one disk.
//   2. `install_iso = null`, apply again, and the server boots FreeBSD.
//
// `image` is in `ignore_changes` because it describes a disk that no longer
// exists after step 1, and `prevent_destroy` is set because this machine's disk
// is where the training history lives. Terraform should never be one typo away
// from deleting it.
resource "hcloud_server" "athletos" {
  name        = var.server_name
  server_type = var.server_type
  location    = var.location
  image       = var.bootstrap_image
  iso         = var.install_iso

  ssh_keys     = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.web.id]

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    app = "athletos"
    env = "production"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [image, ssh_keys]
  }
}

output "ipv4_address" {
  description = "Point the A record for APP_DOMAIN and api.APP_DOMAIN here."
  value       = hcloud_server.athletos.ipv4_address
}

output "ipv6_address" {
  description = "Point the AAAA records here."
  value       = hcloud_server.athletos.ipv6_address
}

output "ssh" {
  description = "How to get in once bsdinstall has run."
  value       = "ssh root@${hcloud_server.athletos.ipv4_address}"
}
