# Security Audit Report for kube-recycle-bin

**Date**: 2025-01-27  
**Auditor**: Security Review  
**Scope**: Full codebase security review

## Executive Summary

This security audit identified several security vulnerabilities and areas for improvement in the kube-recycle-bin codebase. The most critical issue is improper file permissions on TLS private keys. Several medium-severity issues related to denial of service (DoS) protection and resource validation were also identified.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. TLS Private Key File Permissions (CRITICAL)

**Location**: `internal/webhook/webhook.go:64`

**Issue**: The TLS private key file is written with `0644` permissions, making it readable by all users on the system.

```go
err := os.WriteFile(consts.WebhookServiceTLSKeyFile, key, 0644)
```

**Impact**: 
- Any user or process on the same system can read the private key
- Compromised pod could extract the private key
- Potential for man-in-the-middle attacks if the key is leaked

**Recommendation**: 
- Change permissions to `0600` (read/write for owner only)
- Consider using `0400` (read-only) if the key doesn't need to be modified after creation

**Fix**:
```go
err := os.WriteFile(consts.WebhookServiceTLSKeyFile, key, 0600)
```

**CVSS Score**: 7.5 (High)

---

## 🟠 HIGH SEVERITY ISSUES

### 2. Missing Request Source Verification (HIGH)

**Location**: `internal/webhook/webhook.go:73-103`

**Issue**: The webhook handler doesn't verify that requests originate from the Kubernetes API server. While TLS is used, there's no additional verification mechanism to ensure requests are legitimate.

**Impact**:
- Potential for spoofed requests if TLS is compromised
- No verification of request authenticity beyond TLS handshake

**Recommendation**:
- Implement webhook request authentication using Kubernetes ServiceAccount tokens
- Verify the `User-Agent` header matches Kubernetes API server patterns
- Consider implementing request signing or additional authentication layers

**CVSS Score**: 6.5 (Medium-High)

---

## 🟡 MEDIUM SEVERITY ISSUES

### 3. Unbounded Request Body Size (MEDIUM)

**Location**: `internal/webhook/webhook.go:106-117`

**Issue**: The JSON decoder doesn't enforce a maximum request body size, allowing arbitrarily large resources to be sent to the webhook.

```go
if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
```

**Impact**:
- Denial of Service (DoS) attacks by sending extremely large resources
- Memory exhaustion in the webhook pod
- Potential crashes or unresponsive service

**Recommendation**:
```go
r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024) // 10MB limit
```
- Set a reasonable maximum body size (e.g., 10MB for admission reviews)
- Return appropriate error responses for oversized requests
- Monitor and log oversized request attempts

**CVSS Score**: 5.3 (Medium)

### 4. No Resource Size Validation Before Storage (MEDIUM)

**Location**: `internal/webhook/webhook.go:85-100`

**Issue**: There's no validation on the size of resources being recycled before storing them as `RecycleItem` objects.

**Impact**:
- Large resources can consume excessive etcd storage
- Potential for resource exhaustion in the Kubernetes cluster
- Performance degradation when listing or retrieving recycle items

**Recommendation**:
- Validate the size of `request.OldObject.Raw` before processing
- Set a maximum size limit for recyclable resources (e.g., 5MB)
- Reject oversized resources with appropriate error messages
- Consider implementing size quotas per namespace

**CVSS Score**: 5.3 (Medium)

### 5. No Rate Limiting (MEDIUM)

**Location**: `internal/webhook/webhook.go:73-103`

**Issue**: The webhook handler doesn't implement rate limiting or request throttling.

**Impact**:
- Denial of Service (DoS) attacks through request flooding
- Resource exhaustion from processing too many requests simultaneously
- Potential service unavailability

**Recommendation**:
- Implement rate limiting middleware
- Use Kubernetes API server's built-in admission control limits where possible
- Monitor and alert on unusual request patterns
- Consider implementing circuit breaker pattern for error handling

**CVSS Score**: 5.3 (Medium)

---

## 🔵 LOW SEVERITY / INFORMATIONAL ISSUES

### 6. TLS Certificate File Permissions (LOW)

**Location**: `internal/webhook/webhook.go:60`

**Issue**: TLS certificate file is written with `0644` permissions. While less critical than the private key, certificate files typically don't need world-readable permissions.

**Recommendation**: Change to `0644` is acceptable for certificates, but `0600` would be more restrictive and still functional.

**CVSS Score**: 2.5 (Low)

### 7. Missing Error Context in Logs (INFORMATIONAL)

**Location**: Multiple locations

**Issue**: Error messages don't always include sufficient context for security auditing.

**Recommendation**:
- Include request identifiers (UID) in error logs
- Log user/service account information when available
- Ensure sensitive data is not logged

### 8. No Input Sanitization for Resource Names (LOW)

**Location**: `cmd/krb-cli/cmd/restore.go:76`, `cmd/krb-cli/cmd/view.go:82`

**Issue**: Resource names from user input are used directly without validation.

**Impact**: 
- Potential for path traversal or injection attacks (though mitigated by Kubernetes API validation)
- Error messages might leak information

**Recommendation**:
- Validate resource names match Kubernetes naming conventions
- Sanitize input before using in API calls
- Return generic error messages for invalid inputs

**CVSS Score**: 3.1 (Low)

### 9. Webhook Always Allows (INFORMATIONAL)

**Location**: `internal/webhook/webhook.go:147`

**Issue**: The webhook always returns `Allowed: true`.

**Note**: This appears to be intentional design - the webhook is for recycling, not blocking. However, consider if there are scenarios where recycling should be denied (e.g., during maintenance, resource quotas exceeded).

---

## ✅ POSITIVE SECURITY PRACTICES

1. **TLS Encryption**: Proper TLS implementation with self-signed certificates
2. **RBAC Implementation**: Appropriate Kubernetes RBAC roles and bindings are defined
3. **Namespace Isolation**: Components run in dedicated `krb-system` namespace
4. **HTTP/2 Disabled**: Controller properly disables HTTP/2 to mitigate known vulnerabilities
5. **Resource Limits**: Appropriate CPU and memory limits are set in deployments
6. **Minimal Permissions**: Webhook service account has minimal required permissions

---

## 📋 RECOMMENDATIONS SUMMARY

### Immediate Actions (Critical/High):
1. ✅ **Fix TLS private key file permissions** (CRITICAL) - Change to `0600`
2. ✅ **Add request body size limits** - Implement `http.MaxBytesReader` with reasonable limits
3. ✅ **Add resource size validation** - Validate resource size before storing as RecycleItem

### Short-term Improvements (Medium):
4. ✅ **Implement rate limiting** - Add rate limiting middleware to webhook handler
5. ✅ **Add request source verification** - Implement additional authentication checks
6. ✅ **Add comprehensive error logging** - Include request context and sanitized error messages

### Long-term Enhancements (Low/Informational):
7. ✅ **Input validation** - Add comprehensive input validation for CLI commands
8. ✅ **Monitoring and alerting** - Add security monitoring for suspicious patterns
9. ✅ **Security testing** - Add security-focused unit and integration tests

---

## 🔒 COMPLIANCE NOTES

- The codebase follows Kubernetes security best practices in most areas
- RBAC is properly implemented with principle of least privilege
- TLS is correctly used for webhook communication
- No hardcoded secrets found in the codebase

---

## 📝 REFERENCES

- [Kubernetes Webhook Security Best Practices](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-732: Incorrect Permission Assignment for Critical Resource](https://cwe.mitre.org/data/definitions/732.html)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)

---

**Report End**


