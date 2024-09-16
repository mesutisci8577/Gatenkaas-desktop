import React, {useState, useEffect} from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Formik, Form, useField, useFormikContext } from "formik";

import { PencilSquareIcon } from '@heroicons/react/24/outline';

import './App.css';

const RadioGroup = ({
	label,
	description,
	options = [
		{ label: "Ja", value: "ja" },
		{ label: "Nee", value: "nee" },
	],
	includeOther = false,
	...props
}) => {
	const [field, meta] = useField(props);
	const [isOtherSelected, setIsOtherSelected] = useState(false);

	let optionsArray = options;

	if (optionsArray.length === 0) {
		optionsArray = [
			{ label: "Ja", value: "ja" },
			{ label: "Nee", value: "nee" },
		];
	}

	const { setFieldValue } = useFormikContext();

	// Handler to manage the other input value
	const handleOtherInputChange = (e) => {
		setFieldValue(field.name, e.target.value);
	};

	return (
		<div className={props.width ? "w-" + props.width : "w-full"}>
			<div className={`${props.className} mt-8 px-2 mb-2`}>
				<label className="block text-sm font-medium leading-6 text-gray-900">
					{label}
				</label>
				<p
					className="text-sm leading-5 text-gray-500"
					dangerouslySetInnerHTML={{ __html: description }}
				></p>
				<fieldset className="mt-4">
					<div className="space-y-2">
						{optionsArray.map((option, index) => (
							<div key={index} className="flex items-center">
								<input
									id={field.name + "_" + option.value}
									name={field.name}
									type="radio"
									{...field}
									value={option.value}
									checked={field.value === option.value}
									className="focus:ring-brand-500 h-4 w-4 text-brand-600 border-gray-300 cursor-pointer"
								/>
								<label
									htmlFor={field.name + "_" + option.value}
									className="ml-3 block text-sm text-gray-700 cursor-pointer"
								>
									{option.label}
								</label>
							</div>
						))}
						{includeOther && (
							<div className="flex items-center">
								<input
									id="otherOption"
									name={field.name}
									type="radio"
									{...field}
									value="other"
									checked={isOtherSelected}
									onChange={() => {
										setIsOtherSelected(true);
										setFieldValue(field.name, "other");
									}}
									className="focus:ring-brand-500 h-4 w-4 text-brand-600 border-gray-300"
								/>
								<label
									htmlFor="otherOption"
									className="ml-3 block text-sm font-medium text-gray-700"
								>
									Anders, namelijk...
								</label>
								{isOtherSelected && (
									<input
										type="text"
										onChange={handleOtherInputChange}
										placeholder="Vul hier in..."
										className="ml-3 py-2 px-4 rounded border border-gray-300"
									/>
								)}
							</div>
						)}
					</div>
					{meta.touched && meta.error ? (
						<div className="error mt-2">{meta.error}</div>
					) : null}
				</fieldset>
			</div>
		</div>
	);
};
const Welcome = () => {
	const [selectedSoftware, setSelectedSoftware] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		const storedSoftware = localStorage.getItem("selectedSoftware");
		if (storedSoftware) {
			setSelectedSoftware(storedSoftware);
		}
	}, []);

	const handleSubmit = (values) => {
		localStorage.setItem("selectedSoftware", values.software);
		setSelectedSoftware(values.software);
		setIsEditing(false);
	};

	const softwareOptions = [
		{ label: "Exquise Next Gen", value: "exquise_next_gen" },
		{ label: "Exquise Classic", value: "exquise_classic" },
		{ label: "Simplex", value: "simplex" },
		{ label: "Oase", value: "oase" },
		{ label: "Novadent", value: "novadent" },
	];

	const getSoftwareLabel = (value) => {
		const option = softwareOptions.find((opt) => opt.value === value);
		return option ? option.label : "";
	};

	return (
		<div>
			<h1 className="text-2xl font-bold pb-2">
				Gelukt! Snelterecht staat aan.
			</h1>
			<p className="pb-4 text-gray-700">
				Welke praktijksoftware gebruik je?
			</p>
			{selectedSoftware && !isEditing ? (
				<div className="py-6 flex items-center">
					<p>
						<span className="font-bold">Praktijksoftware:</span>{" "}
						{getSoftwareLabel(selectedSoftware)}
					</p>
					<button onClick={() => setIsEditing(true)} id="edit-software__btn" >
						<PencilSquareIcon id="edit-software__icon" />
					</button>
				</div>
			) : (
				<Formik
					initialValues={{ software: selectedSoftware }}
					onSubmit={handleSubmit}
				>
					{() => (
						<Form>
							<div id="select-software">
								<RadioGroup
									name="software"
									label="Selecteer uw software"
									options={softwareOptions}
								/>
							</div>
							<button type="submit">Opslaan</button>
						</Form>
					)}
				</Formik>
			)}
			<div className="bg-slate-100 rounded-xl p-8 mt-4">
				<h3 className="text-lg font-bold pb-2">
					Zo gebruik je de desktop app
				</h3>
				<ol className="list-decimal list-inside">
					<li>Open de patiëntenkaart in de praktijksoftware</li>
					<li>
						Klik op het Snelterecht icoon onderin je taakbalk of
						gebruik Control Shift S
					</li>
					<li>Klaar! Ga verder in Snelterecht</li>
				</ol>
			</div>
		</div>
	);
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
      </Routes>
    </Router>
  );
}
