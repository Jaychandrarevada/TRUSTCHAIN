/**
 * Verify hub /verify — The central public verification & tamper detection portal.
 * Features:
 *  1. One-click Live Tamper Defense Demo (Osmania University Degree)
 *  2. Direct PDF Certificate Upload (drag-and-drop) with cryptographic re-hashing
 *  3. Standard Certificate ID lookup
 *  4. Blockchain technical explanation panel for examiners/panel members
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  FileUp,
  Download,
  Play,
  HelpCircle,
  ChevronDown,
  Sparkles,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { aiApi, verifyApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { VerdictResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { VerdictBody } from "./VerdictPage";

const UID_PATTERN = /^TC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i;

export default function VerifyHub() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState("");
  const [fileUid, setFileUid] = useState("");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<VerdictResponse | null>(null);
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [advisory, setAdvisory] = useState<{ suspicious: boolean; reasons: string[] } | null>(null);

  // Fetch demo certificates (e.g. Osmania University)
  const { data: demoData } = useQuery({
    queryKey: ["demo-certs"],
    queryFn: verifyApi.demoCerts,
    staleTime: 60_000,
  });

  const demoCert = demoData?.demo_certificates?.find((c) =>
    c.institution_slug.includes("osmania") || c.institution_name.toLowerCase().includes("osmania")
  ) || demoData?.demo_certificates?.[0];

  // Upload PDF Mutation
  const handlePdfUpload = async (file: File) => {
    setIsVerifyingFile(true);
    setUploadedFileName(file.name);
    setResult(null);
    try {
      const res = await verifyApi.uploadPdf(file);
      setResult(res);
      if (res.verdict === "VALID") {
        toast("success", "Certificate verified successfully on blockchain!");
      } else if (res.verdict === "TAMPERED") {
        toast("danger", "CRITICAL: Tampered or forged certificate detected!");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast("danger", err.problem.detail);
      } else {
        toast("danger", "Failed to process certificate file. Ensure it is a valid TrustChain PDF.");
      }
    } finally {
      setIsVerifyingFile(false);
    }
  };

  // Instant Test from Demo Button (Fetches PDF blob and feeds to verifier)
  const testDemoPdf = async (url: string, fileName: string) => {
    setIsVerifyingFile(true);
    setUploadedFileName(fileName);
    setResult(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not download sample PDF");
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      const res = await verifyApi.uploadPdf(file);
      setResult(res);
      if (res.verdict === "VALID") {
        toast("success", "Original certificate verified: 100% genuine and anchored on-chain!");
      } else if (res.verdict === "TAMPERED") {
        toast("danger", "Tamper detected: The altered marks failed cryptographic verification!");
      }
    } catch (err) {
      toast("danger", "Error running demo test.");
    } finally {
      setIsVerifyingFile(false);
    }
  };

  // File JSON verification
  const fileVerify = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      setAdvisory(null);
      void aiApi.detectSuspicious(parsed)
        .then((res) => setAdvisory({ suspicious: res.suspicious, reasons: res.reasons }))
        .catch(() => undefined);
      return verifyApi.byFile(fileUid.trim().toUpperCase(), parsed);
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.verdict === "VALID") toast("success", "Certificate valid and unchanged!");
      else if (data.verdict === "TAMPERED") toast("danger", "Tampering detected!");
    },
    onError: (err) => {
      if (err instanceof SyntaxError) toast("warning", "That isn't valid JSON — paste the certificate data exactly.");
      else if (err instanceof ApiError) toast("danger", err.problem.detail);
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3.5 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
          <ShieldCheck className="h-4 w-4" />
          Zero-Trust Public Blockchain Verifier
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary">
          Verify Academic Credentials
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-xl mx-auto">
          Free, instant, and tamper-proof verification anchored to the blockchain. Upload an official
          degree certificate PDF or test our live tamper-detection demonstration below.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {/* ── 1. LIVE TAMPER DEFENSE DEMONSTRATION CARD (FOR PANEL) ── */}
        <div className="overflow-hidden rounded-2xl border-2 border-primary-500/30 bg-gradient-to-br from-primary-500/5 via-background-elevated to-primary-500/10 p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default/60 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                <Sparkles className="h-3.5 w-3.5" /> Live Panel Demonstration
              </span>
              <h2 className="text-lg font-bold text-text-primary">
                Osmania University Degree Verification
              </h2>
              <p className="text-xs text-text-secondary">
                Compare an authentic degree against a modified forgery with altered CGPA marks.
              </p>
            </div>
            {demoCert && (
              <span className="self-start sm:self-auto rounded bg-background px-2.5 py-1 text-[11px] font-mono text-text-secondary border border-border-default">
                ID: {demoCert.cert_uid}
              </span>
            )}
          </div>

          {/* Side-by-side Cards */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Authentic Card */}
            <div className="rounded-xl border border-success-500/40 bg-success-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success-700 dark:text-success-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 1. Authentic Original
                  </span>
                  <span className="text-[10px] rounded bg-success-500/20 px-1.5 py-0.5 text-success-800 dark:text-success-300 font-semibold">
                    Anchored On-Chain
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                  <div className="font-semibold text-text-primary">
                    {demoCert?.student_name || "K. Rahul Sharma"}
                  </div>
                  <div>{demoCert?.program || "B.Tech Computer Science & Engg"}</div>
                  <div className="mt-1 font-mono text-[11px] text-success-700 dark:text-success-400">
                    Authentic CGPA: <strong>8.85</strong> (First Class)
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full text-xs font-semibold gap-1.5"
                  onClick={() =>
                    testDemoPdf(
                      demoCert?.pdf_url || "/api/v1/verify/TC-806F-EC48-CE44/pdf",
                      "Degree_Original_Osmania.pdf"
                    )
                  }
                  loading={isVerifyingFile && uploadedFileName?.includes("Original")}
                >
                  <Play className="h-3.5 w-3.5" /> Test Original Document
                </Button>
                <a
                  href={demoCert?.pdf_url || "/api/v1/verify/TC-806F-EC48-CE44/pdf"}
                  download="Degree_Original_Osmania.pdf"
                  className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text-primary py-1"
                >
                  <Download className="h-3 w-3" /> Download Authentic PDF
                </a>
              </div>
            </div>

            {/* Tampered / Forged Card */}
            <div className="rounded-xl border border-danger-500/40 bg-danger-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-700 dark:text-danger-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> 2. Altered / Fake Copy
                  </span>
                  <span className="text-[10px] rounded bg-danger-500/20 px-1.5 py-0.5 text-danger-800 dark:text-danger-300 font-semibold">
                    Tampered Marks
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                  <div className="font-semibold text-text-primary">
                    {demoCert?.student_name || "K. Rahul Sharma"}
                  </div>
                  <div>{demoCert?.program || "B.Tech Computer Science & Engg"}</div>
                  <div className="mt-1 font-mono text-[11px] text-danger-700 dark:text-danger-400">
                    Modified CGPA: <strong className="line-through text-text-secondary">8.85</strong> → <strong>9.95</strong> (FORGED)
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold text-danger-600 border-danger-500/40 hover:bg-danger-500/10 gap-1.5"
                  onClick={() =>
                    testDemoPdf(
                      demoCert?.pdf_tampered_url || "/api/v1/verify/TC-806F-EC48-CE44/pdf-tampered",
                      "Degree_TAMPERED_Osmania.pdf"
                    )
                  }
                  loading={isVerifyingFile && uploadedFileName?.includes("TAMPERED")}
                >
                  <Play className="h-3.5 w-3.5" /> Test Tampered Document
                </Button>
                <a
                  href={demoCert?.pdf_tampered_url || "/api/v1/verify/TC-806F-EC48-CE44/pdf-tampered"}
                  download="Degree_TAMPERED_Osmania.pdf"
                  className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text-primary py-1"
                >
                  <Download className="h-3 w-3" /> Download Tampered PDF
                </a>
              </div>
            </div>
          </div>

          {/* Panel Explanation Accordion */}
          <div className="mt-4 border-t border-border-default/60 pt-3">
            <button
              type="button"
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="flex w-full items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-primary-500" />
                How does TrustChain detect tampering on the blockchain? (Panel Talking Points)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showTechDetails ? "rotate-180" : ""}`} />
            </button>

            {showTechDetails && (
              <div className="mt-3 rounded-lg bg-background p-4 text-xs text-text-secondary space-y-2 border border-border-default leading-relaxed">
                <p>
                  <strong>1. Cryptographic Fingerprint (SHA-256):</strong> When Osmania University issues the
                  certificate, TrustChain computes a SHA-256 hash of all details (student name, hall ticket number,
                  division, CGPA, and university stamp).
                </p>
                <p>
                  <strong>2. Zero PII on Public Chain:</strong> Storing high-res PDF files directly on Ethereum or
                  Polygon would cost thousands in gas fees and violate privacy regulations (DPDP Act / GDPR). Instead,
                  thousands of certificate hashes are grouped into a <strong>Merkle Tree</strong>, and only the 32-byte{" "}
                  <strong>Merkle Root</strong> is anchored into the smart contract.
                </p>
                <p>
                  <strong>3. The Avalanche Effect:</strong> Changing even a single letter, digit (e.g. 8.85 to 9.95), or
                  photo pixel changes 50% of the bits in the cryptographic hash. When uploaded, TrustChain re-hashes
                  the document and checks the Merkle proof against the smart contract. Since the hash does not match, the
                  system immediately flags it as <strong>TAMPERED</strong>!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. DRAG AND DROP PDF UPLOAD BOX ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileUp className="h-4 w-4 text-primary-500" />
              Upload Certificate PDF
            </CardTitle>
            <CardDescription>
              Drag & drop any university certificate PDF you received. The system will inspect its cryptographic
              watermark, recompute the content hash, and verify it against the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePdfUpload(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type === "application/pdf") {
                  void handlePdfUpload(file);
                } else {
                  toast("warning", "Please drop a PDF certificate file.");
                }
              }}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-default/80 bg-background-elevated/50 p-8 text-center transition hover:border-primary-500/60 hover:bg-primary-500/5 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-text-primary">
                {isVerifyingFile ? "Analyzing document & querying blockchain..." : "Click or drag certificate PDF here"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Supports authentic or tampered TrustChain PDF certificates</p>
            </div>
          </CardContent>
        </Card>

        {/* ── 3. LOOK UP BY CERTIFICATE ID ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary-500" />
              Look up by Certificate ID
            </CardTitle>
            <CardDescription>
              IDs look like TC-XXXX-XXXX-XXXX and appear under the certificate QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = uid.trim().toUpperCase();
                if (!UID_PATTERN.test(clean)) {
                  toast("warning", "That doesn't look like a certificate ID — check for typos.");
                  return;
                }
                navigate(`/v/${clean}`);
              }}
            >
              <div className="flex-1">
                <TextField
                  label="Certificate ID"
                  placeholder="TC-806F-EC48-CE44"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  className="font-mono uppercase"
                  required
                />
              </div>
              <Button type="submit">Verify On-Chain</Button>
            </form>
          </CardContent>
        </Card>

        {/* ── 4. ADVANCED: RAW JSON VERIFICATION (COLLAPSED) ── */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAdvancedJson(!showAdvancedJson)}
            className="text-xs text-text-secondary hover:text-text-primary underline"
          >
            {showAdvancedJson ? "Hide advanced JSON payload verifier" : "Advanced: Verify raw JSON payload"}
          </button>
        </div>

        {showAdvancedJson && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verify Raw JSON Payload</CardTitle>
              <CardDescription>
                Paste the certificate's JSON data to re-compute its content hash directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  fileVerify.mutate();
                }}
              >
                <TextField
                  label="Certificate ID"
                  value={fileUid}
                  className="font-mono"
                  onChange={(e) => setFileUid(e.target.value)}
                  placeholder="TC-806F-EC48-CE44"
                  required
                />
                <TextAreaField
                  label="Certificate data (JSON)"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="font-mono text-xs"
                  placeholder='{"holder_name": "K. Rahul Sharma", "cgpa": "8.85"}'
                  required
                />
                <Button type="submit" loading={fileVerify.isPending} className="self-start">
                  Check against sealed record
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Heuristic AI Advisory */}
        {advisory?.suspicious && (
          <div className="rounded-lg border border-warning-400/40 bg-warning-100/60 p-3 text-sm dark:bg-warning-700/10">
            <p className="flex items-center gap-1.5 font-medium text-warning-700 dark:text-warning-400">
              <Sparkles className="h-4 w-4" aria-hidden /> AI advisory — patterns worth a second look
            </p>
            {advisory.reasons.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-xs text-text-secondary">
                {advisory.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── 5. VERDICT DISPLAY (INSTANT RENDER) ── */}
        {result && (
          <div className="mt-4 scroll-mt-8" id="verdict-result">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Verification Result for: {uploadedFileName || result.certificate.cert_uid}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setResult(null)} className="text-xs">
                Clear Result
              </Button>
            </div>
            <VerdictBody data={result} />
          </div>
        )}
      </div>
    </div>
  );
}
