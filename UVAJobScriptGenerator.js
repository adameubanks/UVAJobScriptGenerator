/*****************************************************************\

Copyright (C) 2014, Brigham Young University

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

*******************************************************************

Available at: https://github.com/BYUHPC/BYUJobScriptGenerator

Author:  Ryan Cox <ryan_cox@byu.edu>

This script generator was originally created for Brigham Young University and
is tailored to its specific needs and configuration.  It is unlikely that this
script will work for you without modification since there are many, many ways
to configure a job scheduler.

This should integrate easily into any existing website.  Use CSS for styling.

TODO:
	job arrays
	tooltip/help for each parameter row

\*****************************************************************/



var UVAScriptGen = function(div) {
	this.values = {};
	this.containerDiv = div;
	this.inputs = {};
	this.inputs.features = {};
	this.formrows = [];
	this.settings = {
		// script_formats = [ ["htmlname1", "Text1"], ["htmlname2", "Text2"], ... ]
		script_formats : [ ["slurm", "Slurm"], ["pbs", "PBS"] ], // first is default
		defaults : {
			email_address : "myemail@example.com", //example.com should be blackholed
		},
		qos : {
			preemptable : "standby",
			test : "test"
		},
		/* You may want to dynamically generate features/partitions. See example HTML file */
		features : {},
		features_status : {},
		partitions : {},
		partitions_status : {},
	};
	return this;
};

UVAScriptGen.prototype.newCheckbox = function(args) {
	var tthis = this;
	var newEl = document.createElement("input");
	newEl.type = "checkbox";
	var formrows = this.formrows;
	if(args.checked)
			newEl.checked = true;
	if(args.toggle) {
			newEl.onclick = newEl.onchange = function () {
					if(formrows[args.toggle]) {
							formrows[args.toggle].style.display = newEl.checked ? "" : "none";
					}
					tthis.updateJobscript();
			};
	}
	else {
			newEl.onclick = newEl.onchange = function () {
					tthis.updateJobscript();
			};
	}
	return newEl;
}

UVAScriptGen.prototype.newInput = function(args) {
	var tthis = this;
	var newEl = document.createElement("input");
	newEl.type = "text";
	if(args.size)
		newEl.size = args.size;
	if(args.maxLength)
		newEl.maxLength = args.maxLength;
	if(args.value)
		newEl.value = args.value;
	newEl.onclick = newEl.onchange = function () {
		tthis.updateJobscript();
	};
	return newEl;
}

UVAScriptGen.prototype.newSelect = function(args) {
	var tthis = this;
	var newEl = document.createElement("select");
	if(args.options) {
		for(var i in args.options) {
			var newOpt = document.createElement("option");
			newOpt.value = args.options[i][0];
			newOpt.text = args.options[i][1];
			if(args.selected && args.selected == args.options[i][0])
				newOpt.selected = true;
			newEl.appendChild(newOpt);
		}
	}
	newEl.onclick = newEl.onchange = function () {
		tthis.updateJobscript();
	};
	return newEl;
}

UVAScriptGen.prototype.newSpan = function() {
	var newEl = document.createElement("span");
	if(arguments[0])
		newEl.id = arguments[0];
	for (var i = 1; i < arguments.length; i++) {
		if(typeof arguments[i] == "string") {
			newEl.appendChild(document.createTextNode(arguments[i]));
		} else
			newEl.appendChild(arguments[i]);
	}
	return newEl;
};

UVAScriptGen.prototype.newA = function(url, body) {
	var a = document.createElement("a");
	a.href = url;
	a.appendChild(document.createTextNode(body));
	a.target = "_base";
	return a;
}

UVAScriptGen.prototype.createForm = function(doc) {
	function br() {
			return document.createElement("br");
	}

	function newHeaderRow(text) {
			var headerDiv = document.createElement("div");
			var header = document.createElement("h3");
			header.appendChild(document.createTextNode(text));
			headerDiv.appendChild(header);
			return headerDiv;
	}

	form = document.createElement("form");

	// Main form elements
	form.appendChild(newHeaderRow("Parameters"));

	// Job name
	this.inputs.job_name = this.newInput({});
	form.appendChild(this.createLabelInputPair("Job name: ", this.inputs.job_name));

	// Number of processor cores across all nodes
	this.inputs.num_cores = this.newInput({value: 1});
	form.appendChild(this.createLabelInputPair("Number of processor cores across all nodes: ", this.inputs.num_cores));

	// Number of GPUs
	this.inputs.num_gpus = this.newInput({value: 0, size: 4});
	form.appendChild(this.createLabelInputPair("Number of GPUs: ", this.inputs.num_gpus));

	// Memory per processor core
	this.inputs.mem_per_core = this.newInput({value: 1, size: 6});
	this.inputs.mem_units = this.newSelect({options: [["GB", "GB"], ["MB", "MB"]]});
	form.appendChild(this.createLabelInputPair("Memory per processor core: ", this.newSpan(null, this.inputs.mem_per_core, this.inputs.mem_units)));

	this.inputs.features = [];
	if(this.settings.features.show) {
		var features_span = this.newSpan("uva_sg_input_features");
		for(var i in this.settings.features.names) {
			var new_checkbox = this.newCheckbox({checked:0});
			new_checkbox.feature_name = this.settings.features.names[i];
			this.inputs.features.push(new_checkbox);
			var url = this.newA(this.settings.features.info_base_url + this.settings.features.names[i], "?");
			var feature_container = this.newSpan(null);
			feature_container.className = "uva_sg_input_feature_container";
			var name_span = this.newSpan("uva_sg_input_feature_" + new_checkbox.feature_name, new_checkbox, this.settings.features.names[i] + " [", url, "]");
			name_span.className = "uva_sg_input_feature_name";
			feature_container.appendChild(name_span);
			if(this.settings.features_status && this.settings.features_status[this.settings.features.names[i]]) {
				var feature_status = this.settings.features_status[this.settings.features.names[i]];
				feature_container.appendChild(
					this.newSpan(	null,
							"Nodes avail: ",
							feature_status.nodes_free + "/" + feature_status.nodes_total,
							br(),
							"Cores avail: ",
							feature_status.cores_free + "/" + feature_status.cores_total
					)
				);
			}
			features_span.appendChild(feature_container);
		}
		form.appendChild(this.createLabelInputPair("Features: ", features_span));
	}

	// Partitions section
	this.inputs.partitions = [];
	if (this.settings.partitions.show) {
			var partitions_span = this.newSpan("uva_sg_input_partitions");
			for (var i in this.settings.partitions.names) {
					var new_checkbox = this.newCheckbox({checked: 0});
					new_checkbox.partition_name = this.settings.partitions.names[i];
					this.inputs.partitions.push(new_checkbox);
					var url = this.newA(this.settings.partitions.info_base_url + this.settings.partitions.names[i], "?");
					var partition_container = this.newSpan(null);
					partition_container.className = "uva_sg_input_partition_container";
					var name_span = this.newSpan(null, this.settings.partitions.names[i], url);
					name_span.className = "uva_sg_input_partition_name";
					partition_container.appendChild(new_checkbox);
					partition_container.appendChild(name_span);
					partitions_span.appendChild(partition_container);
			}
			form.appendChild(this.createLabelInputPair("Partitions: ", partitions_span));
	}

	// Collapsible menu for other elements
	var collapsibleDiv = document.createElement("div");
	collapsibleDiv.className = "collapse";
	collapsibleDiv.id = "advancedSettings";

	this.inputs.single_node = this.newCheckbox({checked: 1});
	this.inputs.wallhours = this.newInput({value: "1", size: 3});
	this.inputs.wallmins = this.newInput({value: "00", size: 2, maxLength: 2});
	this.inputs.wallsecs = this.newInput({value: "00", size: 2, maxLength: 2});
	this.inputs.is_test = this.newCheckbox({checked: 0});
	this.inputs.is_preemptable = this.newCheckbox({checked: 0, toggle: "is_requeueable"});
	this.inputs.is_requeueable = this.newCheckbox({checked: 0});
	this.inputs.in_group = this.newCheckbox({checked: 0, toggle: "group_name"});
	this.inputs.group_name = this.newInput({value: "MYGROUPNAME"});
	this.inputs.need_licenses = this.newCheckbox({checked: 0, toggle: "licenses"});
	this.inputs.lic0_name = this.newInput({});
	this.inputs.lic0_count = this.newInput({size: 3, maxLength: 4});
	this.inputs.lic1_name = this.newInput({});
	this.inputs.lic1_count = this.newInput({size: 3, maxLength: 4});
	this.inputs.lic2_name = this.newInput({});
	this.inputs.lic2_count = this.newInput({size: 3, maxLength: 4});
	this.inputs.email_begin = this.newCheckbox({checked: 0});
	this.inputs.email_end = this.newCheckbox({checked: 0});
	this.inputs.email_abort = this.newCheckbox({checked: 0});
	this.inputs.email_address = this.newInput({value: this.settings.defaults.email_address});

	collapsibleDiv.appendChild(document.createElement("br"));
	collapsibleDiv.appendChild(this.createLabelInputPair("Limit this job to one node: ", this.inputs.single_node));
	collapsibleDiv.appendChild(this.createLabelInputPair("Walltime: ", this.newSpan(null, this.inputs.wallhours, " hours ", this.inputs.wallmins, " mins ", this.inputs.wallsecs, " secs")));
	collapsibleDiv.appendChild(this.createLabelInputPair("Job is a test job: ", this.inputs.is_test));
	collapsibleDiv.appendChild(this.createLabelInputPair("Job is preemptable: ", this.inputs.is_preemptable));
	collapsibleDiv.appendChild(this.createLabelInputPair("Job is requeueable: ", this.inputs.is_requeueable));
	collapsibleDiv.appendChild(this.createLabelInputPair("I am in a file sharing group and my group members need to read/modify my output files: ", this.inputs.in_group));
	collapsibleDiv.appendChild(this.createLabelInputPair("Group name (case sensitive): ", this.inputs.group_name));
	collapsibleDiv.appendChild(this.createLabelInputPair("Need licenses? ", this.inputs.need_licenses));
	collapsibleDiv.appendChild(this.createLabelInputPair("Licenses: ", this.newSpan(null, "Name ", this.inputs.lic0_name, " Count ", this.inputs.lic0_count, br(), "Name ", this.inputs.lic1_name, " Count ", this.inputs.lic1_count, br(), "Name ", this.inputs.lic2_name, " Count ", this.inputs.lic2_count)));
	collapsibleDiv.appendChild(this.createLabelInputPair("Receive email for job events: ", this.newSpan(null, this.inputs.email_begin, " begin ", this.inputs.email_end, " end ", this.inputs.email_abort, " abort")));
	collapsibleDiv.appendChild(this.createLabelInputPair("Email address: ", this.inputs.email_address));

	// Collapsible button
	var collapsibleButton = document.createElement("button");
	collapsibleButton.type = "button";
	collapsibleButton.className = "btn btn-primary";
	collapsibleButton.setAttribute("data-toggle", "collapse");
	collapsibleButton.setAttribute("data-target", "#advancedSettings");
	collapsibleButton.appendChild(document.createTextNode("Advanced Settings"));
	form.appendChild(collapsibleButton);

	form.appendChild(collapsibleDiv);

	return form;
};

// Helper function to create label-input pair
UVAScriptGen.prototype.createLabelInputPair = function(labelText, inputElement) {
	var div = document.createElement("div");
	div.className = "input-pair";
	var label = document.createElement("label");
	label.className = "input-label";
	label.appendChild(document.createTextNode(labelText));
	div.appendChild(label);
	div.appendChild(inputElement);
	return div;
};

// Helper function to create a span element with multiple children
UVAScriptGen.prototype.newSpan = function(id, ...children) {
	var span = document.createElement("span");
	if (id) span.id = id;
	for (var child of children) {
			if (typeof child === "string") {
					span.appendChild(document.createTextNode(child));
			} else {
					span.appendChild(child);
			}
	}
	return span;
};


UVAScriptGen.prototype.retrieveValues = function() {
	var jobnotes = [];
	this.values.MB_per_core = Math.round(this.inputs.mem_per_core.value * (this.inputs.mem_units.value =="GB" ? 1024 : 1));

	this.values.features = [];
	for(var i in this.inputs.features) {
		if(this.inputs.features[i].checked){
			this.values.features.push(this.inputs.features[i].feature_name);
		} else {
		}
	}

	this.values.partitions = [];
	for(var i in this.inputs.partitions) {
		if(this.inputs.partitions[i].checked){
			this.values.partitions.push(this.inputs.partitions[i].partition_name);
		} else {
		}
	}

	this.values.is_test = this.inputs.is_test.checked;
	this.values.is_preemptable = this.inputs.is_preemptable && this.inputs.is_preemptable.checked;
	this.values.is_requeueable = this.inputs.is_requeueable && this.inputs.is_requeueable.checked;
	this.values.walltime_in_minutes = this.inputs.wallhours.value * 3600 + this.inputs.wallmins.value * 60;
	this.values.num_cores = this.inputs.num_cores.value;
	if(this.inputs.single_node.checked)
		this.values.nodes = 1;
	this.values.gpus = this.inputs.num_gpus.value
	this.values.job_name = this.inputs.job_name.value;
	this.values.sendemail = {};
	this.values.sendemail.begin = this.inputs.email_begin.checked;
	this.values.sendemail.end = this.inputs.email_end.checked;
	this.values.sendemail.abort = this.inputs.email_abort.checked;
	this.values.email_address = this.inputs.email_address.value;

	/* Add warnings, etc. to jobnotes array */
	if(this.values.MB_per_core > 20*1024*1024)
		jobnotes.push("Are you crazy? That is way too much RAM!");
	if(this.values.walltime_in_minutes > 86400*7)
		jobnotes.push("Global maximum walltime is 7 days");
	if(this.values.walltime_in_minutes > 86400*3 && this.values.partitions.indexOf("p2") > -1)
		jobnotes.push("Partition p2 maximum walltime is 3 days");
	if(this.values.MB_per_core > 24*1024 && this.values.partitions.indexOf("p1") > -1)
		jobnotes.push("Partition p1 nodes have 24 GB of RAM. You want more than that per core");

	this.jobNotesDiv.innerHTML = jobnotes.join("<br/>\n");
};

UVAScriptGen.prototype.generateScriptPBS = function () {
	this.retrieveValues();

	var scr = "#!/bin/bash\n\n#Submit this script with: qsub thefilename\n\n";
	var walltime = "walltime=" + this.inputs.wallhours.value + ":" + this.inputs.wallmins.value + ":" + this.inputs.wallsecs.value;
	var procs = "procs=" + this.values.num_cores;

	if(this.inputs.single_node.checked)
		procs = "nodes=1:ppn=" + this.values.num_cores;

	if(this.inputs.num_gpus.value > 0)
		procs += ":gpus=" + this.inputs.num_gpus.value;
	var features = "";

	if(this.values.features.length > 0)
		features = ",feature='" + this.values.features.join(",") + "'";
	var qos = "";

	if(this.inputs.is_preemptable.checked)
		qos = ",qos=" + this.settings.qos.preemptable;
	else if(this.inputs.is_test.checked)
		qos = ",qos=" + this.settings.qos.test;
	scr += "#PBS -l " + procs + features + ",pmem=" + this.inputs.mem_per_core.value + this.inputs.mem_units.value + "," + walltime + qos + "\n";

	if(this.values.partitions.length > 0)
		scr += "#PBS -q " + this.values.partitions[0] + "\n";
	
	if(this.inputs.job_name.value != "") {
		scr += "#PBS -N " + this.inputs.job_name.value + "\n";
	}
	if(this.inputs.need_licenses.checked) {
		var lics = new Array();
		var show_lics = 0;
		if(this.inputs.lic0_name.value != "" && this.inputs.lic0_count.value > 0) {
			lics.push(this.inputs.lic0_name.value + "+" + this.inputs.lic0_count.value);
			show_lics = 1;
		}
		if(this.inputs.lic1_name.value != "" && this.inputs.lic1_count.value > 0) {
			lics.push(this.inputs.lic1_name.value + "+" + this.inputs.lic1_count.value);
			show_lics = 1;
		}
		if(this.inputs.lic2_name.value != "" && this.inputs.lic2_count.value > 0) {
			lics.push(this.inputs.lic2_name.value + "+" + this.inputs.lic2_count.value);
			show_lics = 1;
		}
		if(show_lics)
			scr += "#PBS -W x=GRES:" + lics.join("%") + "   #format: lic1_name+lic1_count%lic2_name+lic2_count\n";
	}

	if(this.inputs.email_begin.checked || this.inputs.email_end.checked || this.inputs.email_abort.checked) {
		var emailletters = [];
		if(this.inputs.email_begin.checked)
			emailletters.push("b");
		if(this.inputs.email_end.checked)
			emailletters.push("e");
		if(this.inputs.email_abort.checked)
			emailletters.push("a");
		scr += "#PBS -m " + emailletters.join("") + "\n";
		scr += "#PBS -M " + this.inputs.email_address.value + "\n";
		if(this.inputs.email_address.value == this.settings.defaults.email_address)
			scr += "echo \"$USER: Please change the -M option to your real email address before submitting. Then remove this line.\"; exit 1\n";
	}

	var requeueable = this.inputs.is_requeueable.checked ? "#PBS -r y    # Job can be requeued if it is preempted\n" : "";
	scr += requeueable;

	if(this.inputs.in_group.checked) {
		scr += "\n# Set the output permissions on the .oJOBID and .eJOBID files to be 0660 (owner and group can read/write but not others)\n";
		scr += "#PBS -W umask=0007\n";
		scr += "\n# Set the group ownership on the .oJOBID and .eJOBID files to be '" + this.inputs.group_name.value +"'\n";
		scr += "#PBS -W group_list=" + this.inputs.group_name.value + "\n";
		scr += "\n# Set the output permissions on files written from my script to be 0660 and directories to be 0770 (owner and group can read/write but not others)\n";
		scr += "umask 0007\n";
	}
	scr += "\n# LOAD MODULES, INSERT CODE, AND RUN YOUR PROGRAMS HERE\n";

	return scr;
};


UVAScriptGen.prototype.generateScriptSLURM = function () {
	var pbscompat = true;
	var pmemmb;
	var procs;
	var features = "";

	var scr = "#!/bin/bash\n\n#Submit this script with: sbatch thefilename\n\n";
	var sbatch = function sbatch(txt) {
		scr += "#SBATCH " + txt + "\n";
	};
	
	sbatch("--time=" + this.inputs.wallhours.value + ":" + this.inputs.wallmins.value + ":" + this.inputs.wallsecs.value + "   # walltime");
	
	var procs;
	sbatch("--ntasks=" + this.values.num_cores + "   # number of processor cores (i.e. tasks)");
	if(this.inputs.single_node.checked) {
		sbatch("--nodes=1   # number of nodes");
	}

	if(this.inputs.num_gpus.value > 0) {
		sbatch("--gres=gpu:" + this.inputs.num_gpus.value);
	}

	if(this.values.features.length > 0) {
		var features = this.values.features.join("&");
		sbatch("-C '" + features + "'   # features syntax (use quotes): -C 'a&b&c&d'");
	}
	if(this.values.partitions.length > 0) {
		var partitions = this.values.partitions.join(",");
		sbatch("-p " + partitions + "   # partition(s)");
	}

	sbatch("--mem-per-cpu=" + this.inputs.mem_per_core.value + this.inputs.mem_units.value.substr(0,1) + "   # memory per CPU core");

	if(this.inputs.job_name.value && this.inputs.job_name.value != "") {
		sbatch("-J \"" + this.inputs.job_name.value + "\"   # job name");
	}
	
	if(this.inputs.email_begin.checked || this.inputs.email_end.checked || this.inputs.email_abort.checked) {
		sbatch("--mail-user=" + this.values.email_address + "   # email address");
		if(this.inputs.email_address.value == this.settings.defaults.email_address)
			scr += "echo \"$USER: Please change the --mail-user option to your real email address before submitting. Then remove this line.\"; exit 1\n";
		if(this.inputs.email_begin.checked)
			sbatch("--mail-type=BEGIN");
		if(this.inputs.email_end.checked)
			sbatch("--mail-type=END");
		if(this.inputs.email_abort.checked)
			sbatch("--mail-type=FAIL");
	}
	if(this.inputs.is_preemptable.checked)
		sbatch("--qos=" + this.settings.qos.preemptable);
	else if(this.inputs.is_test.checked)
		sbatch("--qos=" + this.settings.qos.test);
	if(this.inputs.is_requeueable.checked)
		sbatch("--requeue   #requeue when preempted and on node failure");
	if(this.inputs.need_licenses.checked) {
		var lics = new Array();
		var show_lics = 0;
		if(this.inputs.lic0_name.value != "" && this.inputs.lic0_count.value > 0) {
			lics.push(this.inputs.lic0_name.value + ":" + this.inputs.lic0_count.value);
			show_lics = 1;
		}
		if(this.inputs.lic1_name.value != "" && this.inputs.lic1_count.value > 0) {
			lics.push(this.inputs.lic1_name.value + ":" + this.inputs.lic1_count.value);
			show_lics = 1;
		}
		if(this.inputs.lic2_name.value != "" && this.inputs.lic2_count.value > 0) {
			lics.push(this.inputs.lic2_name.value + ":" + this.inputs.lic2_count.value);
			show_lics = 1;
		}
		if(show_lics)
			sbatch("--licenses=" + lics.join(",") + "   #format: lic1_name:lic1_count,lic2_name:lic2_count");
	}
	if(this.inputs.in_group.checked) {
		sbatch("--gid=" + this.inputs.group_name.value);
	}


	scr += "\n\n# LOAD MODULES, INSERT CODE, AND RUN YOUR PROGRAMS HERE\n";
	return scr;
};

function stackTrace() {
    var err = new Error();
    return err.stack;
}

UVAScriptGen.prototype.updateJobscript = function() {
	this.retrieveValues();
	this.toJobScript();
	return;
};

UVAScriptGen.prototype.init = function() {
	this.inputDiv = document.createElement("div");
	this.inputDiv.id = "uva_sg_input_container";
	this.containerDiv.appendChild(this.inputDiv);

	var scriptHeader = document.createElement("h1");
	scriptHeader.id = "uva_sg_script_header";
	scriptHeader.appendChild(document.createTextNode("Job Script"));
	this.containerDiv.appendChild(scriptHeader);

	this.scriptFormatSelectorDiv = document.createElement("div");
	this.scriptFormatSelectorDiv.id = "uva_sg_script_format_selector_container";
	this.script_format_selector = this.newSelect({ options : this.settings.script_formats });
	this.script_format_selector.id = "uva_sg_script_format_selector";
	this.containerDiv.appendChild(this.newSpan("uva_sg_script_format_selector_container", "Script format:", this.script_format_selector));

	this.form = this.createForm();
	this.inputDiv.appendChild(this.form);

	this.jobNotesDiv = document.createElement("div");
	this.jobNotesDiv.id = "uva_sg_jobnotes";
	this.containerDiv.appendChild(this.jobNotesDiv);

	this.jobScriptDiv = document.createElement("div");
	this.jobScriptDiv.id = "uva_sg_jobscript";
	this.containerDiv.appendChild(this.jobScriptDiv);

	this.updateJobscript();
};

UVAScriptGen.prototype.toJobScript = function() {
	var schedformat = uva_sg_script_format_selector.options[uva_sg_script_format_selector.selectedIndex].value;
	var scr;
	switch(schedformat) {
		case "slurm" :
			scr = this.generateScriptSLURM();
			break;
		case "pbs" :
			scr = this.generateScriptPBS();
			break;
	}
	this.jobScriptDiv.innerHTML = "<pre><code>" + scr + "</code></pre>";
};