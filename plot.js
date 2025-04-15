// Container class that manages plots, controls, and images
class DRContainer {
    constructor(data, config) {
        this.plot1 = new DRPlot(data, config.plot1);
        this.plot2 = new DRPlot(data, config.plot2);
        this.controls = new DRControls(data, config.controls, this.plot1, this.plot2);
        this.images = new DRImages(data, config.images);
    }
}

// DRPlot class (simplified to focus on plotting logic)
class DRPlot {
    constructor(data, config) {
        this.data = data;
        this.metric = config.metric;
        this.techniques = ["MDS", "TSNE", "RANDOM"];

        this.svg = d3.select(config.plot);
        this.tooltipContainer = d3.select(config.tooltipContainer);

        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.width = this.svg.node().getBoundingClientRect().width - this.margin.left - this.margin.right;
        this.height = this.svg.node().getBoundingClientRect().height - this.margin.top - this.margin.bottom;

        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scaleLog().range([this.height, 0]);

        this.line = d3.line()
            .x(d => this.x(d.range))
            .y(d => this.y(d.value));

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.xAxis = d3.axisBottom(this.x);
        this.yAxis = d3.axisLeft(this.y);

        this.svg.append("text")
            .attr("x", (this.margin.left + this.width / 2))
            .attr("y", 20)
            .attr('text-anchor', 'middle')
            .style('font-size', "20px")
            .text(this.metric === 'stress' ? "Stress" : "KL-Divergence");

        this.createAxes();
    }

    createAxes() {
        this.g.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(this.xAxis);

        this.g.append("g")
            .attr("class", "y axis")
            .call(this.yAxis);
    }

    update(datasetName) {
        const dataset = this.data[datasetName][this.metric];

        let [start, stop, num] = dataset.scales;
        dataset.range = d3.range(start, stop, (stop - start) / num);

        this.x.domain([start, stop]);
        this.y.domain([
            d3.min(this.techniques, k => d3.min(dataset[k])),
            d3.max(this.techniques, k => d3.max(dataset[k]))
        ]);

        this.g.select(".x.axis").transition().duration(750).call(this.xAxis);
        this.g.select(".y.axis").transition().duration(750).call(this.yAxis);
        this.g.selectAll(".line, circle, .legend").remove();

        this.techniques.forEach((key, index) => {
            if (document.getElementById(key).checked) {
                this.drawLine(dataset, key);
                this.drawMin(dataset, key, index);
            }
        });
    }

    drawLine(dataset, key) {
        this.g.append("path")
            .datum(dataset[key].map((v, i) => ({ range: dataset.range[i], value: v })))
            .attr("fill", "none")
            .attr("stroke", this.colorForKey(key))
            .attr("stroke-width", 1.5)
            .attr("class", "line")
            .attr("d", this.line);
    }

    drawMin(dataset, key, legendIndex) {
        let argmin = d3.scan(dataset[key], (a, b) => d3.ascending(a, b));
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
    }

    colorForKey(key) {
        return key === "MDS" ? "#A40000FF" : key === "TSNE" ? "#16317DFF" : "#007E2FFF";
    }
}

// Sidebar controller
class DRControls {
    constructor(data, config, plot1, plot2) {
        this.data = data;
        this.select = d3.select(config.select);
        this.plot1 = plot1;
        this.plot2 = plot2;

        d3.select(config.select).on('change', () => this.update());
        this.populateSelect();
        // this.attachEvents();
    }

    populateSelect() {
        this.select.selectAll("option")
            .data(Object.keys(this.data))
            .enter().append("option")
            .text(d => d.charAt(0).toUpperCase() + d.slice(1))
            .attr("value", d => d);

        this.select.property("value", "iris");
        this.select.dispatch("change");
    }

    attachEvents() {
        this.select.on("change", () => this.update());
        d3.selectAll("input[type=checkbox]").on("change", () => this.update());
    }

    update() {
        const dataset = this.select.property("value");
        this.plot1.update(dataset);
        this.plot2.update(dataset);
    }
}

// Image panel
class DRImages {
    constructor(data, config) {
        this.data = data;
        this.techniques = ["MDS", "TSNE", "RANDOM"];
        this.imageDiv = d3.select(config.images).append("div").attr("id", "imageDiv");

        d3.select(config.select).on("change", () => this.update());
        d3.selectAll("input[type=checkbox]").on("change", () => this.update());

        this.update();
    }

    update() {
        this.imageDiv.selectAll("div").remove();

        const dataset = d3.select("#datasetSelect").property("value");
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
}

d3.json("./output.json").then(data => {
    new DRContainer(data, {
        plot1: { plot: "#plot", tooltipContainer: "#tooltipContainer", metric: "stress" },
        plot2: { plot: "#plot2", tooltipContainer: "#tooltipContainer", metric: "KL" },
        controls: { select: "#datasetSelect" },
        images: { images: "#images", select: "#datasetSelect" }
    });
});
