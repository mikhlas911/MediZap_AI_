import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient"; // adjust path as needed
import { v4 as uuidv4 } from 'uuid';

const WalkInRegistrationForm = () => {
  const [formData, setFormData] = useState({
    patient_id: uuidv4(),
    clinic_id: "",  // You'll fetch this
    full_name: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    reason_for_visit: "",
    status: "waiting",
  });

  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    // Fetch clinic options
    const fetchClinics = async () => {
      const { data, error } = await supabase.from("clinics").select("id, name");
      if (data) setClinics(data);
      else console.error("Error fetching clinics:", error);
    };
    fetchClinics();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("walkin_patients").insert([
      { ...formData }
    ]);
    if (error) alert("Submission failed: " + error.message);
    else alert("Patient registered successfully!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Walk-In Patient Registration</h2>

      <label>
        Clinic:
        <select name="clinic_id" value={formData.clinic_id} onChange={handleChange} required className="block w-full">
          <option value="">Select Clinic</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
          ))}
        </select>
      </label>

      <label>
        Full Name:
        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="block w-full" />
      </label>

      <label>
        Date of Birth:
        <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className="block w-full" />
      </label>

      <label>
        Gender:
        <select name="gender" value={formData.gender} onChange={handleChange} required className="block w-full">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <label>
        Contact Number:
        <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} required className="block w-full" />
      </label>

      <label>
        Reason for Visit:
        <textarea name="reason_for_visit" value={formData.reason_for_visit} onChange={handleChange} required className="block w-full" />
      </label>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register
      </button>
    </form>
  );
};

export default WalkInRegistrationForm;
