$(function() {
	retrieveDefaultValuesFromLocalStorage();
	setupButtonListeners();
});

var infer = function() {
	$('#output').html("Inferring...");
	$("#resultContainer").show();
	$('html').scrollTop(100000);

	getSettingsFromForm(function(settings) {
		$.ajax(settings).then(function(response) {
			if(settings.format == "json") {
				var pretty = $('<pre>');
				var formatted = JSON.stringify(response, null, 4)

				pretty.html(formatted);
				$('#output').html("").append(pretty);
				$('html').scrollTop(100000);
			} else {
				var arrayBufferView = new Uint8Array(response);
				var blob = new Blob([arrayBufferView], {
					'type': 'image\/jpeg'
				});
				var base64image = window.URL.createObjectURL(blob);

				var img = $('<img/>');
				img.get(0).onload = function() {
					$('html').scrollTop(100000);
				};
				img.attr('src', base64image);
				$('#output').html("").append(img);
			}
		});
	});
};

var retrieveDefaultValuesFromLocalStorage = function() {
    try {
        var access_token = localStorage.getItem("rf.access_token");
        var model = localStorage.getItem("rf.model");
        var format = localStorage.getItem("rf.format");

        if (access_token) $('#access_token').val(access_token);
        if (model) $('#model').val(model);
        if (format) $('#format').val(format);
    } catch (e) {
        // localStorage disabled
    }

    $('#model').change(function() {
        localStorage.setItem('rf.model', $(this).val());
    });

    $('#access_token').change(function() {
        localStorage.setItem('rf.access_token', $(this).val());
    });

    $('#format').change(function() {
        localStorage.setItem('rf.format', $(this).val());
    });
};

var setupButtonListeners = function() {
	// run inference when the form is submitted
	$('#inputForm').submit(function() {
        infer();
        return false;
    });
	
	// make the buttons blue when clicked
	// and show the proper "Select file" or "Enter url" state
	$('.bttn').click(function() {
		$(this).parent().find('.bttn').removeClass('active');
		$(this).addClass('active');
		
		if($('#computerButton').hasClass('active')) {
			$('#fileSelectionContainer').show();
			$('#urlContainer').hide();
		} else {
			$('#fileSelectionContainer').hide();
			$('#urlContainer').show();
		}
		
		if($('#jsonButton').hasClass('active')) {
			$('#imageOptions').hide();
		} else {
			$('#imageOptions').show();
		}
		
		return false;
	});
	
	// wire styled button to hidden file input
	$('#fileMock').click(function() {
		$('#file').click();
	});
	
	// grab the filename when a file is selected
	$("#file").change(function() {
		var path = $(this).val().replace(/\\/g, "/");
		var parts = path.split("/");
		var filename = parts.pop();
		$('#fileName').val(filename);
	});
};

var getSettingsFromForm = function(cb) {
	var settings = {
		method: "POST",
	};
	
	var parts = [
		"https://infer.roboflow.com/",
		$('#model').val(),
		"?access_token=" + $('#access_token').val()
	];
	
	var classes = $('#classes').val();
	if(classes) parts.push("&classes=" + classes);
	
	var confidence = $('#confidence').val()/100;
	if(confidence) parts.push("&confidence=" + confidence);

	var overlap = $('#overlap').val()/100;
	if(overlap) parts.push("&overlap=" + overlap);
	
	var format = $('#format .active').attr('data-value');
	parts.push("&format=" + format);
	settings.format = format;
	
	if(format == "image") {
		var labels = $('#labels .active').attr('data-value');
		if(labels) parts.push("&labels=on");

		var stroke = $('#stroke .active').attr('data-value');
		if(stroke) parts.push("&stroke=" + stroke);
		
		settings.xhr = function() {
			var override = new XMLHttpRequest();
			override.responseType = 'arraybuffer';
			return override;
		}
	}
	
	var method = $('#method .active').attr('data-value');
	if(method == "upload") {
		var file = $('#file').get(0).files && $('#file').get(0).files.item(0);
		if(!file) return alert("Please select a file.");
		
		getBase64fromFile(file).then(function(base64image) {
			settings.url = parts.join("");
			settings.data = base64image;
			
			console.log(settings);
			cb(settings);
		});
	} else {
		var url = $('#url').val();
		if(!url) return alert("Please enter an image URL");
			
		parts.push("&image=" + encodeURIComponent(url));
		
		settings.url = parts.join("");
		console.log(settings);
		cb(settings);
	}
};

var getBase64fromFile = function(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() {
            resolve(reader.result);
        };
        reader.onerror = function(error) {
            reject(error);
        };
    });
};