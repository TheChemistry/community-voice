"use client";

import React, { useState } from "react";
import { useForm, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface SurveyField {
  id: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  condition?: {
    field: string;
    value: string | number;
  };
}

interface Survey {
  id: string;
  title: string;
  description: string;
  schemaJson: SurveyField[];
}

interface SurveyRendererProps {
  survey: Survey;
  onSubmit: (answers: Record<string, any>) => Promise<void>;
  isSubmitting?: boolean;
}

export function SurveyRenderer({ survey, onSubmit, isSubmitting }: SurveyRendererProps) {
  // Build Zod schema dynamically
  const schemaShape: Record<string, any> = {};
  survey.schemaJson.forEach((field) => {
    let fieldSchema: any;
    if (field.type === "NUMBER") {
      fieldSchema = z.number();
    } else {
      fieldSchema = z.string();
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal("")).or(z.null());
    } else {
      if (field.type === "TEXT" || field.type === "SELECT") {
        fieldSchema = fieldSchema.min(1, { message: `${field.label} is required` });
      }
    }
    schemaShape[field.id] = fieldSchema;
  });

  const schema = z.object(schemaShape);
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedValues = useWatch({ control });

  if (!survey.schemaJson || !Array.isArray(survey.schemaJson)) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        Invalid survey schema. Please contact support.
      </div>
    );
  }

  const shouldShowField = (field: SurveyField) => {
    if (!field.condition) return true;
    const conditionValue = watchedValues[field.condition.field];
    return String(conditionValue) === String(field.condition.value);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {survey.schemaJson.map((field) => {
        if (!shouldShowField(field)) return null;

        return (
          <div key={field.id} className="flex flex-col space-y-2">
            <label htmlFor={field.id} className="text-sm font-semibold text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === "TEXT" && (
              <input
                id={field.id}
                type="text"
                {...register(field.id)}
                placeholder={field.placeholder}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[field.id] ? "border-red-500" : "border-gray-300"
                }`}
              />
            )}

            {field.type === "NUMBER" && (
              <input
                id={field.id}
                type="number"
                {...register(field.id, { valueAsNumber: true })}
                placeholder={field.placeholder}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[field.id] ? "border-red-500" : "border-gray-300"
                }`}
              />
            )}

            {field.type === "SELECT" && (
              <select
                id={field.id}
                {...register(field.id)}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[field.id] ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select an option</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {errors[field.id] && (
              <p className="text-xs text-red-500">{(errors[field.id]?.message as string) || "Invalid input"}</p>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 disabled:bg-blue-300 transition shadow-md"
      >
        {isSubmitting ? "Submitting..." : "Submit Response"}
      </button>
    </form>
  );
}
