---
title: "Genesis"
publishedAt: 2026-01-12
tags:
  - programming
  - dx
  - type-safety
  - api
isDraft: true
---

> I need to check if a few services are up before deploying.
> A CLI app.
> It's Go time baby.
> We will do something like `is-everything-ok` and it outputs `OK` or `NOT OK` that'll do.
> KISS.

You said to Claude Code

```go
func main() {
    for _, url := range services {
        resp, err := http.Get(url + "/health")
        if err != nil || resp.StatusCode != 200 {
            fmt.Println("NOT OK")
            os.Exit(1)
        }
    }
    fmt.Println("OK")
}
```

```bash
$ is-everything-ok
OK
```

Opus delivered.

Claude Code:
> **You:** Nice! Now I also want this in a pipeline step check in @here

```bash
if [[ $(is-everything-ok) == "OK" ]]; then
    deploy
fi
```

*Couple weeks go by*

Claude Code:
> **You:**  `is-everything-ok` failed but I don't know which service failed...
> **You:** We need to output which service was down like:
> ```
> NOT OK: https://auth.internal
> OK: ...
> ```
> **You:** This will make it much easier to diagnose in the future
> **Opus:** You're absolutely right!

```diff
func main() {
    for _, url := range services {
        resp, err := http.Get(url + "/health")
        if err != nil || resp.StatusCode != 200 {
-            fmt.Println("NOT OK")
+            fmt.Println("NOT OK: " + url)
            os.Exit(1)
        }
+        fmt.Println("OK: " + url)
    }
-    fmt.Println("OK")
}
```

```bash
$ is-everything-ok
OK: https://api.internal
OK: https://auth.internal
OK: https://db.internal
```

*And another one*  DJ Khaled voice sounds in your head while `git push`ing.

Slack:
> **Alice:** CI is broken
> **Bob:** Worked this morning...
> **Bob:** Did @you change something in `is-everything-ok`?
> **You:** Wait, are you using it?
> **Bob:** We've been using it for a while.
> **You:** I added more detail to the output so we know which service failed
> **Bob:** ...
> **You:** I'll take a look, sec

Claude Code:
> **You:** Hey Bob is using our `is-everything-ok` in @his.py code and we broke it on our last change, please take a look
> **Opus:** I am sorry to hear that, let me take a look
```python
output = subprocess.check_output(["is-everything-ok"]).decode().strip()
if re.match(r"^OK$", output):
```

> **Opus:**

```diff
- if re.match(r"^OK$", output):
+ if re.match(r"^OK", output):
```

```bash
git add -A && git commit -m "fix: match OK prefix instead of exact" && git push
```
> **Opus:**  Fixed, it should be good now. Go tell Bob!

Slack:
> **You:** Hey @Bob @Alice, just pushed a fix, should be good now
> ...
> **Alice:** Works!

*Time goes by*

Slack:
> **Alice**: I think it would be nice if besides the health check we added latency per service
> **Bob**: Yeah that would be nice
> **Bob**: @You
> **You**: Sure..

*here_we_go_again.webp*

Claude Code:
> *You*:
> > **Alice**: I think it would be nice if besides the health check we added latency per service
> > **Bob**: Yeah that would be nice
> > **Bob**: @You
> > **You**: Sure..
>
> Now they say they want latency, please add it to the output

```diff
func main() {
    for _, url := range services {
+        start := time.Now()
        resp, err := http.Get(url + "/health")
+        elapsed := time.Since(start)
        if err != nil || resp.StatusCode != 200 {
-            fmt.Println("NOT OK: " + url)
+            fmt.Printf("NOT OK: %s (%dms)\n", url, elapsed.Milliseconds())
            os.Exit(1)
        }
-        fmt.Println("OK: " + url)
+        fmt.Printf("OK: %s (%dms)\n", url, elapsed.Milliseconds())
    }
}
```

```bash
$ is-everything-ok
OK: https://api.internal (12ms)
OK: https://auth.internal (8ms)
OK: https://db.internal (203ms)
```

You ping Bob.

> **Me:** hey @Bob just added per-service latency to `is-everything-ok`
> **Bob:** k

Two hours later:

> **Alice:** CI is broken again
> **Bob:** @You ...
> **Me:** what? I told you
> **Bob:** didn't think it would matter
> **Me:** it's `OK: https://... (12ms)` now
> **Bob:** Ok

And it is just downhill from there.
And again begin to wonder if there is a better way.

REST API? For this one stupid check? You don't want to run a server in a GitHub workflow.
JSON output so is more robust? How? And you still have no type safety.
Generate types? From what? For every language? You maintain schema + code + N consumer scripts.

You just fixed regex issues. Schema can still change. Consumers still guess. Everything is fragile. Complexity grew exponentially for something stupidly simple.

---

## This is where Forma appears

You declare a contract. One file. Co-located.

```cue
// forma.cue
#HealthResult: {
    url:     string
    status:  int
    latency: int
    ok:      bool
}
```

Why CUE? Reads like what you mean. No boilerplate. Outputs to JSON Schema, OpenAPI, whatever you need.

---

### Your Go code changes

```diff
+ //go:embed forma.cue
+ var schema string

  func main() {
+     if *schemaFlag {
+         fmt.Println(toJSONSchema(schema))
+         return
+     }
+
      for _, url := range services {
          start := time.Now()
          resp, err := http.Get(url + "/health")
          elapsed := time.Since(start)
+
+         result := Result{URL: url, Latency: elapsed.Milliseconds()}
+         if err != nil {
+             result.OK = false
+             result.Error = err.Error()
+         } else {
+             result.OK = resp.StatusCode == 200
+             result.Status = resp.StatusCode
+         }
+
+         if *jsonFlag {
+             json.NewEncoder(os.Stdout).Encode(result)
+         } else {
              if !result.OK {
                  fmt.Fprintf(os.Stderr, "FAIL %s (%dms)\n", url, elapsed.Milliseconds())
                  os.Exit(1)
              }
              fmt.Printf("OK %s (%dms)\n", url, elapsed.Milliseconds())
+         }
      }
  }
```

---

### Your bash script changes

```diff
- if is-everything-ok; then
+ if is-everything-ok --json | jq -es 'all(.ok)' > /dev/null; then
      deploy
  fi
```

---

### Bob's Python script changes

```diff
- result = subprocess.run(["is-everything-ok"], capture_output=True)
- if result.returncode == 0:
+ output = subprocess.check_output(["is-everything-ok", "--json"])
+ results = [json.loads(line) for line in output.splitlines()]
+ if all(r["ok"] for r in results):
      deploy()
```

But wait. What fields exist? What types?

```bash
is-everything-ok --schema | forma generate python > health_types.py
```

```python
from health_types import HealthResult

output = subprocess.check_output(["is-everything-ok", "--json"])
results: list[HealthResult] = [json.loads(line) for line in output.splitlines()]
if all(r.ok for r in results):  # autocomplete works, typos caught
    deploy()
```

---

### Next feature: you add error messages

```diff
  #HealthResult: {
      url:     string
      status:  int
      latency: int
      ok:      bool
+     error?:  string
  }
```

Your Go code changes. You add the field.

Bash? Still works. `.ok` still exists.

Bob's Python? Still works. `data.ok` still exists.

They regenerate types when they want the new field. Or they don't. Their choice.

No ping. No "easy fix, one sec." No twenty minutes for six characters.

---

### What changed?

| Before | After |
|--------|-------|
| You maintain N files | You maintain `forma.cue` |
| Consumers guess the shape | Consumers generate types |
| Every change breaks someone | Additive changes break nobody |
| Tribal knowledge | `--schema` |
| Regex hell | Structured data |
| "did you change something?" | Contract |

**One file. Co-located. Consumers pull. System can't desync.**
