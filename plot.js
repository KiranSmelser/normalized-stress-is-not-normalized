d3.json("./stress_curves.json").then(function (data) {
    var select = d3.select("#datasetSelect");
    var svg = d3.select("#plot");

    var margin = { top: 20, right: 20, bottom: 30, left: 50 };
    var width = 960 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLog().range([height, 0]);

    var line = d3.line()
        .x(function (d) { return x(d.range); })
        .y(function (d) { return y(d.value); });

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Create the X axis
    var xAxis = d3.axisBottom(x);
    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .style("font-family", "Arial, sans-serif")
        .append("text")
        .attr("fill", "#000")
        .attr("x", width / 2)
        .attr("y", margin.bottom) 
        .attr("dy", "-0.1em") 
        .attr("text-anchor", "middle") 
        .style("font-size", "15px") 
        .style("font-family", "Arial, sans-serif")
        .text("Scale value"); 

    // Create the Y axis
    var yAxis = d3.axisLeft(y)
    g.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .style("font-family", "Arial, sans-serif")
        .append("text") 
        .attr("fill", "#000") 
        .attr("transform", "rotate(-90)") 
        .attr("x", -height / 2) 
        .attr("y", -margin.left) 
        .attr("dy", "0.75em") 
        .attr("text-anchor", "middle") 
        .style("font-size", "15px") 
        .style("font-family", "Arial, sans-serif")
        .text("log(Normalized stress)"); 

    select.selectAll("option")
        .data(Object.keys(data))
        .enter().append("option")
        .text(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); })
        .attr("value", function (d) { return d; });

    select.on("change", function () {
        updatePlot();
        updateImages();
        updateOrderText();
    });

    // Add event listeners for the checkboxes
    d3.selectAll("input[type=checkbox]").on("change", function () {
        updateImages();
        updatePlot();
        updateSliders();
        updateOrderText();
    });

    var slider = d3.select("#rangeSlider");
    var sliderValue = d3.select("#sliderValue");

    document.getElementById('rangeSlider').addEventListener('input', function () {
        var maxVal = this.value;
        document.getElementById('MDSSlider').max = maxVal;
        document.getElementById('t-SNESlider').max = maxVal;
        document.getElementById('RandomSlider').max = maxVal;
    });

    // Update the displayed value for the MDS slider
    document.getElementById('MDSSlider').addEventListener('input', function () {
        if (document.getElementById('MDS').checked) {  
            document.getElementById('MDSSliderValue').textContent = this.value;
            updateOrderText();
        }
    });

    // Update the displayed value for the t-SNE slider 
    document.getElementById('t-SNESlider').addEventListener('input', function () {
        if (document.getElementById('t-SNE').checked) {
            document.getElementById('t-SNESliderValue').textContent = this.value;
            updateOrderText();
        }
    });

    // Update the displayed value for the Random slider
    document.getElementById('RandomSlider').addEventListener('input', function () {
        if (document.getElementById('Random').checked) {
            document.getElementById('RandomSliderValue').textContent = this.value;
            updateOrderText();
        }
    });

    // Function to update the visibility of the sliders
    function updateSliders() {
        ["MDS", "t-SNE", "Random"].forEach(function (technique) {
            var isChecked = document.getElementById(technique).checked;
            document.getElementById(technique + 'Slider').style.display = isChecked ? 'inline-block' : 'none';  // Change 'block' to 'inline-block'
            document.getElementById(technique + 'SliderValue').style.display = isChecked ? 'inline-block' : 'none';  // Change 'block' to 'inline-block'
            document.querySelector('label[for=' + technique + 'Slider]').style.display = isChecked ? 'inline-block' : 'none';  // Change 'block' to 'inline-block'
        });
    }

    // Function to update the text for the order of DR techniques
    function updateOrderText() {
        var dataset = data[select.node().value];
        var techniques = ["MDS", "t-SNE", "Random"].filter(function (technique) {
            return document.getElementById(technique).checked; 
        });
        var sliderValues = techniques.map(function (technique) {
            return document.getElementById(technique + 'Slider').value;
        });

        if (techniques.length >= 2) {
            var ranks = techniques.map(function (technique, i) {
                var values = dataset[technique];
                var range = dataset["range"];
                var sliderValue = sliderValues[i];

                var index = d3.bisectLeft(range, sliderValue);

                if (index == range.length) index--;
                if (index > 0 && (sliderValue - range[index - 1]) < (range[index] - sliderValue)) index--;

                return { technique: technique, value: values[index] };
            });

            ranks.sort(function (a, b) { return d3.ascending(a.value, b.value); });

            var orderText = d3.select("#orderText");
            orderText.text(ranks.map(function (d) { return d.technique; }).join(" < "));
        } else {
            document.getElementById('orderText').style.display = 'none';
        }
    }

    var imageDiv = d3.select("#images").append("div").attr("id", "imageDiv");

    // Function to update the images
    function updateImages() {
        imageDiv.selectAll("div").remove();

        var dataset = select.property("value");
        var techniques = ["MDS", "t-SNE", "Random"].filter(function (technique) {
            return d3.select("#" + technique).property("checked");
        });

        var width = 100 / techniques.length + "%";

        techniques.forEach(function (technique) {
            var div = imageDiv.append("div")
                .style("display", "inline-block")
                .style("width", width)
                .style("text-align", "center");

            div.append("p")
                .text(technique)
                .style("font-size", "20px")
                .style("margin-bottom", "0px");

            div.append("img")
                .attr("src", "./images/" + dataset + "_" + technique + ".png")
                .attr("alt", technique + " embedding for " + dataset)
                .style("max-width", "100%")
                .style("margin-top", "0px");
        });
    }

    // Debounce function
    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    slider.on("input", debounce(function () {
        x.domain([0, +this.value]);
        sliderValue.text(this.value);
        updatePlot();
    }, 200)); // 200ms debounce time

    function updatePlot() {
        var dataset = data[select.node().value];

        var maxY = d3.max(["MDS", "t-SNE", "Random"], function (key) { return d3.max(dataset[key]); });
        var minY = d3.min(["MDS", "t-SNE", "Random"], function (key) { return d3.min(dataset[key]); });
        y.domain([minY, maxY]);

        g.select(".x.axis")
            .transition()
            .duration(750)
            .call(xAxis);

        g.select(".y.axis")
            .transition()
            .duration(750)
            .call(yAxis);

        g.selectAll(".line").remove();
        g.selectAll("circle").remove();
        g.selectAll(".legend").remove();

        var legendIndex = 0;
        var minPoints = [];
        ["MDS", "t-SNE", "Random"].forEach(function (key, i) {
            if (document.getElementById(key).checked) {
                g.append("path")
                    .datum(dataset[key].map(function (value, i) { return { range: dataset.range[i], value: value }; }))
                    .attr("fill", "none")
                    .attr("stroke", key === "MDS" ? "#A40000FF" : key === "t-SNE" ? "#16317DFF" : "#007E2FFF")
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round")
                    .attr("stroke-width", 1.5)
                    .attr("d", line)
                    .attr("class", "line");

                // Minimum points
                var minPoint = dataset[key + "_min"];
                var circle = g.append("circle")
                    .attr("cx", x(minPoint[0]))
                    .attr("cy", y(minPoint[1]))
                    .attr("r", 5)
                    .style("fill", key === "MDS" ? "#A40000FF" : key === "t-SNE" ? "#16317DFF" : "#007E2FFF");

                // Tooltip
                var tooltip = d3.select("#tooltipContainer").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                circle.on("mouseover", function (d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html("x: " + minPoint[0] + "<br/>" + "y: " + minPoint[1])
                        .style("left", "10px") 
                        .style("top", "10px"); 
                })
                    .on("mouseout", function (d) {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                circle.on("mouseout", function (d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    tooltip.html(""); 
                });

                // Legend for lines
                var legend = g.append("g")
                    .attr("transform", "translate(" + (width - 20) + "," + (20 + legendIndex * 40) + ")")
                    .attr("class", "legend");

                legend.append("rect")
                    .attr("width", 18)
                    .attr("height", 18)
                    .style("fill", key === "MDS" ? "#A40000FF" : key === "t-SNE" ? "#16317DFF" : "#007E2FFF");

                legend.append("text")
                    .attr("x", -6)
                    .attr("y", 9)
                    .attr("dy", ".35em")
                    .style("text-anchor", "end")
                    .text(key);

                // Legend for min points
                var minLegend = g.append("g")
                    .attr("transform", "translate(" + (width - 20) + "," + (40 + legendIndex * 40) + ")")
                    .attr("class", "legend");

                minLegend.append("circle")
                    .attr("cx", 9)
                    .attr("cy", 9)
                    .attr("r", 5)
                    .style("fill", key === "MDS" ? "#A40000FF" : key === "t-SNE" ? "#16317DFF" : "#007E2FFF");

                minLegend.append("text")
                    .attr("x", -6)
                    .attr("y", 9)
                    .attr("dy", ".35em")
                    .style("text-anchor", "end")
                    .text("Minimum");

                legendIndex++;
            }
        });

    }

    select.property("value", "iris");
    x.domain([0, 12]);
    select.dispatch("change");
    updateImages();
    updateSliders();
});
