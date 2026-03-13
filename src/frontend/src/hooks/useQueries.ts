/**
 * React Query hooks for backend API calls.
 * All query functions follow the pattern: actor check → backend call → return data.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Student, StudentResults } from "../backend.d.ts";
import { useActor } from "./useActor";

// ─── Seeded mock student data ─────────────────────────────────────
// Hardcoded fallback for USN 4MU24EC024 / Dimple S when the backend
// doesn't yet have this student (e.g., on first deploy before admin seeding).
const DIMPLE_SEED: StudentResults = {
  student: {
    usn: "4MU24EC024",
    name: "Dimple S",
    dob: "2000-01-01",
    currentSemester: BigInt(3),
  },
  // SGPA = (7*4+9*4+10*4+7*4+9*2+10*1+10*1+10*2+8*3) / (4+4+4+4+2+1+1+2+3) = 214/25 = 8.56
  cgpa: 8.56,
  allSemesterResults: [
    {
      semester: BigInt(3),
      sgpa: 8.56,
      results: [
        {
          subjectCode: "BMATEC301",
          subjectName: "AV Mathematics-III for EC Engineering",
          internalMarks: BigInt(42),
          externalMarks: BigInt(26),
          totalMarks: BigInt(68),
          grade: "C",
          gradePoints: BigInt(7),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC302",
          subjectName: "Digital System Design Using Verilog",
          internalMarks: BigInt(44),
          externalMarks: BigInt(36),
          totalMarks: BigInt(80),
          grade: "A",
          gradePoints: BigInt(9),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC303",
          subjectName: "Electronic Principles and Circuits",
          internalMarks: BigInt(49),
          externalMarks: BigInt(41),
          totalMarks: BigInt(90),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC304",
          subjectName: "Network Analysis",
          internalMarks: BigInt(42),
          externalMarks: BigInt(19),
          totalMarks: BigInt(61),
          grade: "C",
          gradePoints: BigInt(7),
          credits: BigInt(4),
        },
        {
          subjectCode: "BECL305",
          subjectName: "Analog and Digital Systems Design Lab",
          internalMarks: BigInt(43),
          externalMarks: BigInt(45),
          totalMarks: BigInt(88),
          grade: "A",
          gradePoints: BigInt(9),
          credits: BigInt(2),
        },
        {
          subjectCode: "BSCK307",
          subjectName: "Social Connect and Responsibility",
          internalMarks: BigInt(95),
          externalMarks: BigInt(0),
          totalMarks: BigInt(95),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(1),
        },
        {
          subjectCode: "BNSK359",
          subjectName: "National Service Scheme",
          internalMarks: BigInt(95),
          externalMarks: BigInt(0),
          totalMarks: BigInt(95),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(1),
        },
        {
          subjectCode: "BEC358A",
          subjectName: "LabView Programming",
          internalMarks: BigInt(50),
          externalMarks: BigInt(47),
          totalMarks: BigInt(97),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(2),
        },
        {
          subjectCode: "BEC306C",
          subjectName: "Computer Organization and Architecture",
          internalMarks: BigInt(49),
          externalMarks: BigInt(26),
          totalMarks: BigInt(75),
          grade: "B",
          gradePoints: BigInt(8),
          credits: BigInt(3),
        },
      ],
    },
  ],
};

// Seed data for KEERTHANA (4MU24EC034) — Semester 3
const KEERTHANA_SEED: StudentResults = {
  student: {
    usn: "4MU24EC034",
    name: "KEERTHANA",
    dob: "2000-01-01",
    currentSemester: BigInt(3),
  },
  cgpa: 7.56,
  allSemesterResults: [
    {
      semester: BigInt(3),
      sgpa: 7.56,
      results: [
        {
          subjectCode: "BMATEC301",
          subjectName: "AV Mathematics III for EC",
          internalMarks: BigInt(43),
          externalMarks: BigInt(20),
          totalMarks: BigInt(63),
          grade: "C",
          gradePoints: BigInt(7),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC302",
          subjectName: "Digital System Design Using Verilog",
          internalMarks: BigInt(42),
          externalMarks: BigInt(35),
          totalMarks: BigInt(77),
          grade: "B",
          gradePoints: BigInt(8),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC303",
          subjectName: "Electronic Principles and Circuits",
          internalMarks: BigInt(45),
          externalMarks: BigInt(20),
          totalMarks: BigInt(65),
          grade: "C",
          gradePoints: BigInt(7),
          credits: BigInt(4),
        },
        {
          subjectCode: "BEC304",
          subjectName: "Network Analysis",
          internalMarks: BigInt(35),
          externalMarks: BigInt(18),
          totalMarks: BigInt(53),
          grade: "E",
          gradePoints: BigInt(5),
          credits: BigInt(4),
        },
        {
          subjectCode: "BECL305",
          subjectName: "Analog and Digital Systems Design Lab",
          internalMarks: BigInt(46),
          externalMarks: BigInt(44),
          totalMarks: BigInt(90),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(2),
        },
        {
          subjectCode: "BSCK307",
          subjectName: "Social Connect and Responsibility",
          internalMarks: BigInt(96),
          externalMarks: BigInt(0),
          totalMarks: BigInt(96),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(1),
        },
        {
          subjectCode: "BNSK359",
          subjectName: "National Service Scheme",
          internalMarks: BigInt(95),
          externalMarks: BigInt(0),
          totalMarks: BigInt(95),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(1),
        },
        {
          subjectCode: "BEC358A",
          subjectName: "Labview Programming",
          internalMarks: BigInt(50),
          externalMarks: BigInt(49),
          totalMarks: BigInt(99),
          grade: "S",
          gradePoints: BigInt(10),
          credits: BigInt(2),
        },
        {
          subjectCode: "BEC306C",
          subjectName: "Computer Organization and Architecture",
          internalMarks: BigInt(49),
          externalMarks: BigInt(25),
          totalMarks: BigInt(74),
          grade: "B",
          gradePoints: BigInt(8),
          credits: BigInt(3),
        },
      ],
    },
  ],
};

// Registry of all seeded students (USN lowercase → seed)
const SEEDED_STUDENTS: Record<string, StudentResults> = {
  "4mu24ec024": DIMPLE_SEED,
  "4mu24ec034": KEERTHANA_SEED,
};

// ─── Student Queries ─────────────────────────────────────────────

/** Fetch all results for a given USN — used for student result display */
export function useStudentResults(usn: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["studentResults", usn],
    queryFn: async () => {
      if (!actor || !usn) throw new Error("Actor or USN not available");
      return actor.getStudentResults(usn);
    },
    enabled: !!actor && !isFetching && !!usn,
    staleTime: 30_000,
  });
}

/** Check if a USN + name combination exists (student "login") */
export function useStudentLogin() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ usn, name }: { usn: string; name: string }) => {
      if (!actor) throw new Error("Service not ready");

      try {
        // Fetch the student's results and verify name matches
        const results = await actor.getStudentResults(usn);
        if (!results || !results.student) throw new Error("Student not found");
        const storedName = results.student.name.trim().toLowerCase();
        const enteredName = name.trim().toLowerCase();
        if (storedName !== enteredName)
          throw new Error("Name does not match our records");
        return results;
      } catch (err: unknown) {
        // If the backend call fails, fall back to seeded mock data.
        const usnKey = usn.toLowerCase();
        const nameNorm = name.trim().toLowerCase();
        const seed = SEEDED_STUDENTS[usnKey];

        if (seed && seed.student.name.toLowerCase() === nameNorm) {
          return seed;
        }

        // Re-throw with a clearer message for all other students
        const originalMsg = err instanceof Error ? err.message : "Unauthorized";
        // Preserve "Name does not match" errors as-is
        if (originalMsg.toLowerCase().includes("name")) throw err;
        throw new Error("Unauthorized: You can only view your own results");
      }
    },
  });
}

// ─── Admin Queries ───────────────────────────────────────────────

/** Fetch all students — admin use */
export function useAllStudents() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allStudents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStudents();
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}

/** Check if the current caller is an admin */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ─── Admin Mutations ─────────────────────────────────────────────

/** Add a new student */
export function useAddStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (student: Student) => {
      if (!actor) throw new Error("Service not ready");
      return actor.addStudent(student);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["allStudents"] }),
  });
}

/** Update an existing student */
export function useUpdateStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (student: Student) => {
      if (!actor) throw new Error("Service not ready");
      return actor.updateStudent(student);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["allStudents"] }),
  });
}

/** Delete a student by USN */
export function useDeleteStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (usn: string) => {
      if (!actor) throw new Error("Service not ready");
      return actor.deleteStudent(usn);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["allStudents"] }),
  });
}

/** Add or update a subject result */
export function useAddOrUpdateResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      usn,
      semester,
      subjectCode,
      subjectName,
      internalMarks,
      externalMarks,
      credits,
      announcedOn,
    }: {
      usn: string;
      semester: number;
      subjectCode: string;
      subjectName: string;
      internalMarks: number;
      externalMarks: number;
      credits: number;
      announcedOn?: string;
    }) => {
      if (!actor) throw new Error("Service not ready");
      const dateStr = announcedOn ?? new Date().toISOString().split("T")[0];
      // Cast to any to support the extended backend signature (announcedOn as 8th param).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor.addOrUpdateResult as any)(
        usn,
        BigInt(semester),
        subjectCode,
        subjectName,
        BigInt(internalMarks),
        BigInt(externalMarks),
        BigInt(credits),
        dateStr,
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["studentResults", vars.usn] });
      queryClient.invalidateQueries({
        queryKey: ["marksForStudent", vars.usn],
      });
    },
  });
}

/** Delete a subject result */
export function useDeleteResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      usn,
      semester,
      subjectCode,
    }: {
      usn: string;
      semester: bigint;
      subjectCode: string;
    }) => {
      if (!actor) throw new Error("Service not ready");
      return actor.deleteResult(usn, semester, subjectCode);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["studentResults", vars.usn] });
      queryClient.invalidateQueries({
        queryKey: ["marksForStudent", vars.usn],
      });
    },
  });
}

/** Fetch results for a specific student (admin marks management) */
export function useStudentResultsAdmin(usn: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["marksForStudent", usn],
    queryFn: async () => {
      if (!actor || !usn) return null;
      return actor.getStudentResults(usn);
    },
    enabled: !!actor && !isFetching && !!usn,
    staleTime: 10_000,
  });
}
