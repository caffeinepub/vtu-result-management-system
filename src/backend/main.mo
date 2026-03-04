import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  public type USN = Text;
  public type SubjectCode = Text;
  public type Semester = Nat;

  public type Student = {
    usn : USN;
    name : Text;
    dob : Text; // Date of Birth in "YYYY-MM-DD" format
    currentSemester : Semester;
  };

  public type SemesterResult = {
    subjectCode : SubjectCode;
    subjectName : Text;
    internalMarks : Nat; // out of 50
    externalMarks : Nat; // out of 100
    credits : Nat;
    totalMarks : Nat;
    grade : Text;
    gradePoints : Nat;
  };

  public type SemesterResults = {
    semester : Semester;
    results : [SemesterResult];
    sgpa : Float;
  };

  public type StudentResults = {
    student : Student;
    allSemesterResults : [SemesterResults];
    cgpa : Float;
  };

  public type UserProfile = {
    name : Text;
    usn : ?USN; // Optional USN for students
  };

  module Student {
    public func compareByUSN(student1 : Student, student2 : Student) : Order.Order {
      Text.compare(student1.usn, student2.usn);
    };
  };

  let studentsMap = Map.empty<USN, Student>();
  let resultsMap = Map.empty<USN, Map.Map<Semester, Map.Map<SubjectCode, SemesterResult>>>();
  
  // Map Principal to USN for student authentication
  let principalToUSN = Map.empty<Principal, USN>();
  
  // User profiles
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Access to authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Student Authentication - Login with USN + DOB
  public shared ({ caller }) func studentLogin(usn : USN, dob : Text) : async Bool {
    switch (studentsMap.get(usn)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?student) {
        if (student.dob != dob) {
          Runtime.trap("Invalid credentials");
        };
        
        // Link this principal to the USN
        principalToUSN.add(caller, usn);
        
        // Assign user role if not already assigned
        if (AccessControl.getUserRole(accessControlState, caller) == #guest) {
          AccessControl.assignRole(accessControlState, caller, caller, #user);
        };
        
        // Create/update user profile
        userProfiles.add(caller, {
          name = student.name;
          usn = ?usn;
        });
        
        true;
      };
    };
  };

  // Helper function to check if caller is authorized to view student data
  func isAuthorizedToViewStudent(caller : Principal, usn : USN) : Bool {
    // Admin can view any student
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };
    
    // Student can view their own data
    switch (principalToUSN.get(caller)) {
      case (?studentUSN) { studentUSN == usn };
      case (null) { false };
    };
  };

  // Grade Mapping and Calculations
  func calculateGrade(totalMarks : Nat) : (Text, Nat) {
    switch (totalMarks) {
      case (m) {
        if (m >= 90) { ("S", 10) } else if (m >= 80) { ("A", 9) } else if (m >= 70) {
          ("B", 8);
        } else if (m >= 60) { ("C", 7) } else if (m >= 55) { ("D", 6) } else if (m >= 50) {
          ("E", 5);
        } else { ("F", 0) };
      };
    };
  };

  func calculateSgpa(semesterResults : [SemesterResult]) : Float {
    var totalPoints : Nat = 0;
    var totalCredits : Nat = 0;

    for (result in semesterResults.values()) {
      totalPoints += result.gradePoints * result.credits;
      totalCredits += result.credits;
    };

    if (totalCredits == 0) { return 0.0 };

    totalPoints.toFloat() / totalCredits.toFloat();
  };

  func calculateCgpa(allSgpas : [Float]) : Float {
    if (allSgpas.size() == 0) { return 0.0 };

    var total : Float = 0.0;
    for (sgpa in allSgpas.values()) {
      total += sgpa;
    };

    total / allSgpas.size().toInt().toFloat();
  };

  // Student Management (Admin only)
  public shared ({ caller }) func addStudent(student : Student) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    if (studentsMap.containsKey(student.usn)) {
      Runtime.trap("Student already exists");
    };

    studentsMap.add(student.usn, student);
  };

  public shared ({ caller }) func updateStudent(student : Student) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    if (not (studentsMap.containsKey(student.usn))) {
      Runtime.trap("Student does not exist");
    };

    studentsMap.add(student.usn, student);
  };

  public shared ({ caller }) func deleteStudent(usn : USN) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    if (not (studentsMap.containsKey(usn))) {
      Runtime.trap("Student does not exist");
    };

    studentsMap.remove(usn);
    resultsMap.remove(usn);
    
    // Clean up principal mapping if exists
    for ((principal, studentUSN) in principalToUSN.entries()) {
      if (studentUSN == usn) {
        principalToUSN.remove(principal);
      };
    };
  };

  public query ({ caller }) func getAllStudents() : async [Student] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    studentsMap.values().toArray().sort(Student.compareByUSN);
  };

  // Marks Management (Admin only)
  public shared ({ caller }) func addOrUpdateResult(usn : USN, semester : Semester, subjectCode : SubjectCode, subjectName : Text, internalMarks : Nat, externalMarks : Nat, credits : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    if (not (studentsMap.containsKey(usn))) {
      Runtime.trap("Student does not exist");
    };

    if (internalMarks > 50 or externalMarks > 100) {
      Runtime.trap("Invalid marks: Internal(max 50), External(max 100)");
    };

    let totalMarks = internalMarks + externalMarks;
    let (grade, gradePoints) = calculateGrade(totalMarks);

    let result : SemesterResult = {
      subjectCode;
      subjectName;
      internalMarks;
      externalMarks;
      credits;
      totalMarks;
      grade;
      gradePoints;
    };

    let semesterResults = switch (resultsMap.get(usn)) {
      case (?s) { s };
      case (null) {
        let newMap = Map.empty<Semester, Map.Map<SubjectCode, SemesterResult>>();
        resultsMap.add(usn, newMap);
        newMap;
      };
    };

    let subjectResults = switch (semesterResults.get(semester)) {
      case (?sr) { sr };
      case (null) {
        let newMap = Map.empty<SubjectCode, SemesterResult>();
        semesterResults.add(semester, newMap);
        newMap;
      };
    };

    subjectResults.add(subjectCode, result);
  };

  public shared ({ caller }) func deleteResult(usn : USN, semester : Semester, subjectCode : SubjectCode) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin privileges required");
    };

    switch (resultsMap.get(usn)) {
      case (null) { Runtime.trap("Student results not found") };
      case (?semesterResults) {
        switch (semesterResults.get(semester)) {
          case (null) {
            Runtime.trap("Subject results for semester " # semester.toText() # " not found");
          };
          case (?subjectResults) {
            if (not (subjectResults.containsKey(subjectCode))) {
              Runtime.trap("Subject not found");
            };
            subjectResults.remove(subjectCode);
          };
        };
      };
    };
  };

  // Query APIs (with authorization)
  public query ({ caller }) func getStudentResults(usn : USN) : async StudentResults {
    if (not (isAuthorizedToViewStudent(caller, usn))) {
      Runtime.trap("Unauthorized: You can only view your own results");
    };

    let student = switch (studentsMap.get(usn)) {
      case (null) { Runtime.trap("Student not found") };
      case (?s) { s };
    };

    let semesterResults = switch (resultsMap.get(usn)) {
      case (null) { Map.empty<Semester, Map.Map<SubjectCode, SemesterResult>>() };
      case (?sr) { sr };
    };

    var allResults : [SemesterResults] = [];
    var allSgpas : [Float] = [];

    for ((sem, subjectResults) in semesterResults.entries()) {
      let resultsArray = subjectResults.values().toArray();
      let sgpa = calculateSgpa(resultsArray);

      allResults := allResults.concat([{
        semester = sem;
        results = resultsArray;
        sgpa;
      }]);
      allSgpas := allSgpas.concat([sgpa]);
    };

    let cgpa = calculateCgpa(allSgpas);

    {
      student;
      allSemesterResults = allResults;
      cgpa;
    };
  };

  public query ({ caller }) func getSemesterResults(usn : USN, semester : Semester) : async SemesterResults {
    if (not (isAuthorizedToViewStudent(caller, usn))) {
      Runtime.trap("Unauthorized: You can only view your own results");
    };

    switch (resultsMap.get(usn)) {
      case (null) { Runtime.trap("Student results not found") };
      case (?semesterResults) {
        switch (semesterResults.get(semester)) {
          case (null) { Runtime.trap("Semester results not found") };
          case (?subjectResults) {
            let resultsArray = subjectResults.values().toArray();
            let sgpa = calculateSgpa(resultsArray);

            {
              semester;
              results = resultsArray;
              sgpa;
            };
          };
        };
      };
    };
  };
};
