class DRPlot {
    constructor(data, containerIds) {
        this.data = data;

        // DOM Elements
        this.select = d3.select(containerIds.select);
        this.svg = d3.select(containerIds.plot);
        this.slider = d3.select(containerIds.rangeSlider);
        this.sliderValue = d3.select(containerIds.sliderValue);
        this.imageDiv = d3.select(containerIds.images).append("div").attr("id", "imageDiv");
        this.tooltipContainer = d3.select(containerIds.tooltipContainer);
        this.orderText = d3.select(containerIds.orderText);

        // Config
        this.margin = { top: 20, right: 20, bottom: 30, left: 50 };
        this.width = 960 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        this.techniques = ["MDS", "TSNE", "RANDOM"];

        // Scales and Line
        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scaleLog().range([this.height, 0]);
        this.line = d3.line()
            .x(d => this.x(d.range))
            .y(d => this.y(d.value));

        // SVG group
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Axes
        this.xAxis = d3.axisBottom(this.x);
        this.yAxis = d3.axisLeft(this.y);

        this.metric = containerIds.metric;

        this.init();
    }

    init() {
        this.createAxes();
        this.populateSelect();
        this.attachEvents();
        this.select.property("value", "iris");
        // this.x.domain([0, 12]);
        this.select.dispatch("change");
        this.updateImages();
        // this.updateSliders();
    }

    createAxes() {
        // X Axis
        this.g.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(this.xAxis)
            .append("text")
            .attr("x", this.width / 2)
            .attr("y", this.margin.bottom)
            .attr("dy", "-0.1em")
            .attr("text-anchor", "middle")
            .style("font-size", "15px")
            .text("Scale value");

        // Y Axis
        this.g.append("g")
            .attr("class", "y axis")
            .call(this.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left)
            .attr("dy", "0.75em")
            .attr("text-anchor", "middle")
            .style("font-size", "15px")
            .text("log(Normalized stress)");
    }

    populateSelect() {
        this.select.selectAll("option")
            .data(Object.keys(this.data))
            .enter().append("option")
            .text(d => d.charAt(0).toUpperCase() + d.slice(1))
            .attr("value", d => d);
    }

    attachEvents() {
        this.select.on("change", () => {
            this.updatePlot();
            this.updateImages();
            // this.updateOrderText();
        });

        d3.selectAll("input[type=checkbox]").on("change", () => {
            this.updateImages();
            this.updatePlot();
            // this.updateSliders();
            // this.updateOrderText();
        });

        // document.getElementById('rangeSlider').addEventListener('input', () => {
        //     const maxVal = event.target.value;
        //     this.techniques.forEach(t => {
        //         const slider = document.getElementById(`${t}Slider`);
        //         const val = document.getElementById(`${t}SliderValue`);
        //         slider.max = maxVal;
        //         slider.value = maxVal;
        //         val.textContent = parseFloat(maxVal).toFixed(1);
        //     });
        // });

        // this.techniques.forEach(t => {
        //     document.getElementById(`${t}Slider`).addEventListener('input', e => {
        //         if (document.getElementById(t).checked) {
        //             document.getElementById(`${t}SliderValue`).textContent = parseFloat(e.target.value).toFixed(1);
        //             this.updateOrderText();
        //         }
        //     });
        // });

        // this.slider.on("input", this.debounce(() => {
        //     this.x.domain([0, +this.slider.node().value]);
        //     this.sliderValue.text(this.slider.node().value);
        //     this.updatePlot();
        // }, 200));
    }

    updateSliders() {
        this.techniques.forEach(t => {
            const isChecked = document.getElementById(t).checked;
            ["Slider", "SliderValue"].forEach(suffix => {
                document.getElementById(`${t}${suffix}`).style.display = isChecked ? 'inline-block' : 'none';
            });
            document.querySelector(`label[for=${t}Slider]`).style.display = isChecked ? 'inline-block' : 'none';
        });
    }

    updateOrderText() {
        const dataset = this.data[this.select.node().value];
        const techniques = this.techniques.filter(t => document.getElementById(t).checked);
        const sliderValues = techniques.map(t => +document.getElementById(`${t}Slider`).value);

        if (techniques.length >= 2) {
            const ranks = techniques.map((t, i) => {
                const values = dataset[t];
                const range = dataset.range;
                const val = sliderValues[i];
                let idx = d3.bisectLeft(range, val);
                if (idx == range.length) idx--;
                if (idx > 0 && (val - range[idx - 1]) < (range[idx] - val)) idx--;
                return { technique: t, value: values[idx] };
            });

            ranks.sort((a, b) => d3.ascending(a.value, b.value));
            this.orderText.text(ranks.map(d => d.technique).join(" < "));
        } else {
            this.orderText.style("display", "none");
        }
    }

    updateImages() {
        this.imageDiv.selectAll("div").remove();

        const dataset = this.select.property("value");
        const checked = this.techniques.filter(t => d3.select(`#${t}`).property("checked"));
        const width = 100 / checked.length + "%";

        checked.forEach(t => {
            const div = this.imageDiv.append("div")
                .style("display", "inline-block")
                .style("width", width)
                .style("text-align", "center");

            div.append("p")
                .text(t)
                .style("font-size", "20px")
                .style("margin-bottom", "0px");

            div.append("img")
                .attr("src", `./pdfs/${dataset}_${t}.svg`)
                .attr("alt", `${t} embedding for ${dataset}`)
                .style("max-width", "100%")
                .style("margin-top", "0px");
        });
    }

    updatePlot() {
        const dataset = this.data[this.select.node().value][this.metric];
        const maxY = d3.max(this.techniques, k => d3.max(dataset[k]));
        const minY = d3.min(this.techniques, k => d3.min(dataset[k]));
        this.y.domain([minY, maxY]);

        let [start,stop, num] = dataset.scales;
        dataset.range = d3.range(start,stop, (stop - start) / (num));
        
        this.x.domain([start, stop]);

        this.g.select(".x.axis").transition().duration(750).call(this.xAxis);
        this.g.select(".y.axis").transition().duration(750).call(this.yAxis);
        this.g.selectAll(".line, circle, .legend").remove();

        let legendIndex = 0;

        this.techniques.forEach(key => {
            console.log(key);
            if (document.getElementById(key).checked) {
                this.g.append("path")
                    .datum(dataset[key].map((v, i) => ({ range: dataset.range[i], value: v })))
                    .attr("fill", "none")
                    .attr("stroke", this.colorForKey(key))
                    .attr("stroke-width", 1.5)
                    .attr("class", "line")
                    .attr("d", this.line);

                // const [minX, minY] = dataset[`${key}_min`];
                
                //argmin 
                let argmin = d3.scan(dataset[key], (a,b) => d3.ascending(a,b));
                const minX = dataset.range[argmin];
                const minY = dataset[key][argmin];
                const circle = this.g.append("circle")
                    .attr("cx", this.x(minX))
                    .attr("cy", this.y(minY))
                    .attr("r", 5)
                    .style("fill", this.colorForKey(key));

                const tooltip = this.tooltipContainer.append("div").attr("class", "tooltip").style("opacity", 0);

                circle.on("mouseover", () => {
                    tooltip.transition().duration(200).style("opacity", 0.9);
                    tooltip.html(`x: ${minX}<br/>y: ${minY}`).style("left", "10px").style("top", "10px");
                }).on("mouseout", () => {
                    tooltip.transition().duration(500).style("opacity", 0);
                    tooltip.html("");
                });

                const baseY = 20 + legendIndex * 40;
                this.appendLegend(this.g, key, this.colorForKey(key), baseY);
                this.appendMinLegend(this.g, key, this.colorForKey(key), baseY + 20);

                legendIndex++;
            }
        });
    }

    appendLegend(g, label, color, yOffset) {
        const legend = g.append("g")
            .attr("transform", `translate(${this.width - 20},${yOffset})`)
            .attr("class", "legend");

        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

        legend.append("text")
            .attr("x", -6)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(label);
    }

    appendMinLegend(g, label, color, yOffset) {
        const minLegend = g.append("g")
            .attr("transform", `translate(${this.width - 20},${yOffset})`)
            .attr("class", "legend");

        minLegend.append("circle")
            .attr("cx", 9)
            .attr("cy", 9)
            .attr("r", 5)
            .style("fill", color);

        minLegend.append("text")
            .attr("x", -6)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text("Minimum");
    }

    colorForKey(key) {
        return key === "MDS" ? "#A40000FF" : key === "TSNE" ? "#16317DFF" : "#007E2FFF";
    }

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}


d3.json("./output.json").then(function (data) {
    const plot = new DRPlot(data, {
        select: "#datasetSelect",
        plot: "#plot",
        rangeSlider: "#rangeSlider",
        sliderValue: "#sliderValue",
        images: "#images",
        tooltipContainer: "#tooltipContainer",
        orderText: "#orderText",
        metric: 'stress'
    });
    
});
