document.addEventListener("DOMContentLoaded", async event => {
  let data = await fetch(
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json");

  let education = await data.json();
  data = await fetch(
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json");

  let countries = await data.json();

  let w = 960;
  let h = 556;

  let eduMax = d3.max(education, d => d.bachelorsOrHigher);
  let eduMin = d3.min(education, d => d.bachelorsOrHigher);

  let eduData = education.reduce((result, current) => {
    let { state, fips, area_name, bachelorsOrHigher } = current;
    result[fips] = { state, area_name, bachelorsOrHigher };
    return result;
  }, {});

  let color = d3.scaleQuantize([eduMin, eduMax], d3.schemeBlues[9]);

  let svg = d3.select("#svgc").append("svg").attr("width", w).attr("height", h);

  svg.
  append("g").
  attr("id", "legend").
  attr("transform", `translate(${w - 320},-16)`).
  append(() =>
  legend({ color, tickFormat: ".0f", title: "Bachelors or higher in %" }));


  let path = d3.geoPath();

  let tooltip = d3.select("#tooltip");
  let county = d3.select("#tooltip .counti");
  let state = d3.select("#tooltip #state");
  let percentage = d3.select("#tooltip .percentage");

  svg.
  append("g").
  selectAll("path").
  data(topojson.feature(countries, countries.objects.counties).features).
  join("path").
  attr("fill", d => color(eduData[d.id].bachelorsOrHigher)).
  attr("class", "county").
  attr("data-fips", d => d.id).
  attr("data-education", d => eduData[d.id].bachelorsOrHigher).
  attr("d", path).
  on("mousemove", d => {
    tooltip.transition().duration(100).style("opacity", 1);

    tooltip.
    style("top", d3.event.pageY - 32 + "px").
    style("left", d3.event.pageX + 16 + "px").
    attr("data-education", eduData[d.id].bachelorsOrHigher);

    state.html(eduData[d.id].state);
    county.html(eduData[d.id].area_name);
    percentage.html(eduData[d.id].bachelorsOrHigher);
  }).
  on("mouseout", d => {
    tooltip.transition().style("opacity", 0).duration(0);

    tooltip.style("top", 0 + "px").style("left", 0 + "px");
  });

  svg.
  append("path").
  datum(
  topojson.mesh(countries, countries.objects.states, (a, b) => a !== b)).

  attr("fill", "none").
  attr("stroke", "white").
  attr("stroke-linejoin", "round").
  attr("d", path);
});

function legend({
  color,
  title,
  tickSize = 6,
  width = 320,
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues } =
{}) {
  const svg = d3.
  create("svg").
  attr("width", width).
  attr("height", height).
  attr("viewBox", [0, 0, width, height]).
  style("overflow", "visible").
  style("display", "block");

  let x;

  // Continuous
  if (color.interpolator) {
    x = Object.assign(
    color.
    copy().
    interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
    {
      range() {
        return [marginLeft, width - marginRight];
      } });



    svg.
    append("image").
    attr("x", marginLeft).
    attr("y", marginTop).
    attr("width", width - marginLeft - marginRight).
    attr("height", height - marginTop - marginBottom).
    attr("preserveAspectRatio", "none").
    attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.
        range(n).
        map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Discrete
  else if (color.invertExtent) {
      const thresholds = color.thresholds ?
      color.thresholds() // scaleQuantize
      : color.quantiles ?
      color.quantiles() // scaleQuantile
      : color.domain(); // scaleThreshold

      const thresholdFormat =
      tickFormat === undefined ?
      d => d :
      typeof tickFormat === "string" ?
      d3.format(tickFormat) :
      tickFormat;

      x = d3.
      scaleLinear().
      domain([-1, color.range().length - 1]).
      rangeRound([marginLeft, width - marginRight]);

      svg.
      append("g").
      selectAll("rect").
      data(color.range()).
      join("rect").
      attr("x", (d, i) => x(i - 1)).
      attr("y", marginTop).
      attr("width", (d, i) => x(i) - x(i - 1)).
      attr("height", height - marginTop - marginBottom).
      attr("fill", d => d);

      tickValues = d3.range(thresholds.length);
      tickFormat = i => thresholdFormat(thresholds[i], i);
    }

  svg.
  append("g").
  attr("transform", `translate(0, ${height - marginBottom})`).
  call(
  d3.
  axisBottom(x).
  ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined).
  tickFormat(typeof tickFormat === "function" ? tickFormat : undefined).
  tickSize(tickSize).
  tickValues(tickValues)).

  call((g) =>
  g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height)).

  call(g => g.select(".domain").remove()).
  call((g) =>
  g.
  append("text").
  attr("y", marginTop + marginBottom - height - 6).
  attr("fill", "currentColor").
  attr("text-anchor", "start").
  attr("font-weight", "bold").
  text(title));


  return svg.node();
}