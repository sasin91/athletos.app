# Bundled assets

## `common-passwords.txt.gz`

The corpus `auth::password` compares every new password against, so that NIST SP
800-63B-4 §3.1.1.2 ("verifiers SHALL compare the prospective secrets against a
list that contains commonly-used, expected, or compromised passwords") is
satisfied without the deployment talking to anyone. Shipping it rather than
querying a service is what keeps the default PixMyDay deployment self-contained
and its sub-processor list unchanged (ADR-0011).

**Contents.** 143,742 unique entries, lowercased, one per line, gzipped —
1,173,852 bytes of text down to 383,146 bytes on disk and in the image. It is
the union of two lists, both taken from the
[SecLists](https://github.com/danielmiessler/SecLists) project at
`Passwords/Common-Credentials/`:

| Source file | Entries | Origin |
| --- | --- | --- |
| `xato-net-10-million-passwords-100000.txt` | 100,000 | The 100k most frequent passwords in Mark Burnett's "10 million passwords" corpus, itself assembled from publicly released breach dumps. |
| `100k-most-used-passwords-NCSC.txt` | 99,840 | The top 100k passwords in Have I Been Pwned's Pwned Passwords set, published by the UK National Cyber Security Centre. |

**Licence.** SecLists is distributed under the **MIT Licence**, © 2018 Daniel
Miessler — reproduction and redistribution are permitted with the notice
retained, which this file provides. The NCSC list derives from Have I Been
Pwned's Pwned Passwords data, for which Troy Hunt states there are "no licencing
or attribution requirements"; attribution is given here anyway because it is
welcomed and because provenance matters more than the minimum obligation.

**Transformation applied.** The two lists were concatenated, trimmed,
lowercased, deduplicated and sorted. Nothing was added, and no entry was
invented. Reproduce with:

```powershell
$a = (iwr https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/xato-net-10-million-passwords-100000.txt).Content -split "`n"
$b = (iwr https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt).Content -split "`n"
($a + $b) | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ } | Sort-Object -Unique
```

The remaining normalisation — Unicode lowercasing again, and leetspeak
de-substitution — happens at load time in `auth::password::fold`, so that the
asset stays readable and diffable against its sources rather than being a blob
of pre-folded text nobody can check.

**Why ~100k and not the full Pwned Passwords set.** The complete corpus is
around a billion hashes and tens of gigabytes; the top 100k covers the
overwhelming majority of real guessing attempts, and a deployment that wants the
long tail can turn on the optional HIBP range lookup
(`AUTH_HIBP_ENABLED=true`) instead of paying for it in every image pull.
