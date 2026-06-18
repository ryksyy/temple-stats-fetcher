import { readFileSync, writeFileSync, appendFile } from "fs";
import { promises as fs } from "fs";

function readFileAsStringArray(filePath) {
	try {
		const data = readFileSync(filePath, "utf-8");
		return data.split(/\r?\n/).filter((line) => line.trim() !== "");
	} catch (err) {
		console.error("Error reading file:", err);
		throw err;
	}
}

const test2 = async (wordArray) => {
	let count = 0;
	let total = wordArray.length;
	let delay = 1000; // 1 second delay between requests to avoid rate limits
	console.log("Expected time to complete:", ((total * (delay + 750)) / 1000).toFixed(2), "seconds");
	let startTime = Date.now();
	for (const name of wordArray) {
		console.log(
			`(${++count}/${total}) Time elapsed: ${((Date.now() - startTime) / 1000).toFixed(1)}s - Processing ${name} `,
		);
		await new Promise((resolve) => setTimeout(resolve, delay));
		try {
			const res = await fetch(`https://templeosrs.com/api/player_gains.php?player=${name}&time=month&bosses=1`);
			const res2 = await fetch(
				`https://templeosrs.com/api/player_stats.php?player=${name}&duration=alltime&bosses=1`,
			);

			if (res.status !== 200 || res2.status !== 200) {
				console.error("Error fetching data for", name, " : ", res.status, res2.status);
				continue;
			}
			// parse JSON
			const resData = await res.json();
			const resData2 = await res2.json();

			// unwrap responses when the API nests the payload under `data`
			const monthData = resData?.data ?? resData;
			const allData = resData2?.data ?? resData2;

			// tolerant lookups (API sometimes uses different key names/casing)
			const ehbMonth = monthData?.ehb ?? monthData?.Ehb ?? 0;
			const ehb = allData?.Ehb ?? allData?.ehb ?? allData?.im_ehb ?? 0;
			const ehp = allData?.Overall_ehp ?? allData?.Ehp ?? allData?.im_ehp ?? 0;
			const lvl = allData?.Overall_level ?? allData?.Overall ?? 0;
			const sailing = allData?.Sailing_level ?? allData?.Sailing ?? 0;
			const gameMode = allData.info["Game mode"] ?? "NA";

			const obj = {
				name,
				monthEhb: ehbMonth,
				ehb,
				ehp,
				lvl,
				sailing,
				"Chambers of Xeric": allData["Chambers of Xeric"],
				"Chambers of Xeric Challenge Mode": allData["Chambers of Xeric Challenge Mode"],
				"Theatre of Blood": allData["Theatre of Blood"],
				"Theatre of Blood Challenge Mode": allData["Theatre of Blood Challenge Mode"],
				"Tombs of Amascut": allData["Tombs of Amascut"],
				"Tombs of Amascut Expert": allData["Tombs of Amascut Expert"],
				mode: gameMode === 0 ? "Main" : "Ironman",
				"Gryphon KC": allData["Shellbane Gryphon"],
			};

			let csvLine = "";
			for (const key in obj) {
				csvLine += `${obj[key]},`;
			}
			csvLine = csvLine.slice(0, -1) + "\n";
			await fs.appendFile("results.csv", csvLine);

			// persist result (append as JSON line)
			await fs.appendFile("results.txt", JSON.stringify(obj) + "\n");
		} catch (err) {
			console.error("Error processing", name, err);
		}
	}
	console.log("Processing complete. Total time:", ((Date.now() - startTime) / 1000).toFixed(2), "seconds");
};

try {
	const wordArray = readFileAsStringArray(process.argv[2]);
	if (wordArray.length <= 0) {
		console.error("No names to process. Please check the input file.");
		process.exit(1);
	}
	// write csv headers
	await fs.writeFile(
		"results.csv",
		"name,monthEhb,ehb,ehp,lvl,sailing,CoX,CoX CM,ToB,ToB CM,Tombs,Tombs Expert,mode,Gryphon KC\n",
	);
	test2(wordArray);
} catch (err) {
	console.error("Error initializing results file:", err);
	throw err;
}
