/* End-of-experiment demographics + brief feedback survey.
   All fields except `comments` are required.
   On finish, response is normalized into a flat object that DataPipe will
   write into a single CSV row (trial_type = "survey-html-form"). */

const feedback_demographics = {
  type: jsPsychSurveyHtmlForm,
  button_label: "Finish",
  html: `
    <div style="
      max-width: 720px; margin: 0 auto; text-align: left;
      background: #2a2a2e; color: #f5f5f7; padding: 28px 32px;
      border-radius: 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.35); line-height: 1.5;">

      <h2 style="margin-top: 0; color: #f5f5f7;">Last few questions</h2>
      <p style="color: rgba(245,245,247,0.78); margin-top: 0;">
        Thanks for playing! Please answer a few questions about yourself and your experience.
      </p>

      <!-- ============== Demographics ============== -->
      <div style="margin: 1.5em 0 0.75em; font-weight: 600; font-size: 1.05em;">Demographics</div>

      <!-- Age -->
      <div style="margin-bottom: 1.25em;">
        <label for="age"><strong>Age</strong></label><br>
        <input id="age" name="age" type="number" min="18" max="120" required
               style="width: 110px; padding: 6px 8px; border-radius: 6px;
                      border: 1px solid #555; background: #1f1f22; color: #f5f5f7;">
      </div>

      <!-- Gender -->
      <div style="margin-bottom: 1.25em;">
        <strong>Gender</strong>
        <div style="margin-top: 0.4em;">
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="gender" value="Woman" required> Woman</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="gender" value="Man"> Man</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="gender" value="Non-binary"> Non-binary</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="gender" value="Prefer not to say"> Prefer not to say</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="gender" value="Self-describe"> Self-describe:
            <input type="text" name="gender_self_describe"
                   style="margin-left: 6px; padding: 4px 8px; border-radius: 6px;
                          border: 1px solid #555; background: #1f1f22; color: #f5f5f7;
                          width: 240px;">
          </label>
        </div>
      </div>

      <!-- Race / Ethnicity -->
      <div style="margin-bottom: 1.25em;">
        <strong>Race / ethnicity</strong>
        <div style="color: rgba(245,245,247,0.7); font-size: 0.92em; margin: 0.2em 0 0.4em;">
          Select all that apply.
        </div>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_american_indian" value="1">
          American Indian or Alaska Native</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_asian" value="1">
          Asian</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_black" value="1">
          Black or African American</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_hispanic" value="1">
          Hispanic, Latino, or Spanish origin</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_middle_eastern" value="1">
          Middle Eastern or North African</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_pacific_islander" value="1">
          Native Hawaiian or other Pacific Islander</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_white" value="1">
          White</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_prefer_not" value="1">
          Prefer not to say</label>
        <label style="display:block; margin:0.25em 0;">
          <input type="checkbox" name="race_other" value="1">
          Other:
          <input type="text" name="race_other_text"
                 style="margin-left: 6px; padding: 4px 8px; border-radius: 6px;
                        border: 1px solid #555; background: #1f1f22; color: #f5f5f7;
                        width: 240px;">
        </label>
      </div>

      <!-- ============== Game experience ============== -->
      <div style="margin: 1.75em 0 0.75em; font-weight: 600; font-size: 1.05em;">Gaming experience</div>

      <!-- Minecraft frequency, past month -->
      <div style="margin-bottom: 1.25em;">
        <strong>In the past month, how often did you play Minecraft?</strong>
        <div style="margin-top: 0.4em;">
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="minecraft_freq_1mo" value="Never" required> Not at all</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="minecraft_freq_1mo" value="Once or twice"> Once or twice</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="minecraft_freq_1mo" value="Weekly"> About once a week</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="minecraft_freq_1mo" value="Several_times_per_week"> Several times a week</label>
          <label style="display:block; margin:0.25em 0;">
            <input type="radio" name="minecraft_freq_1mo" value="Daily"> Daily or almost daily</label>
        </div>
      </div>

      <!-- Performance satisfaction -->
      <div style="margin-bottom: 1.25em;">
        <strong>How satisfied are you with your performance in the mining task?</strong>
        <div style="color: rgba(245,245,247,0.7); font-size: 0.92em; margin: 0.2em 0 0.5em;">
          1 = Not at all satisfied · 7 = Extremely satisfied
        </div>
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
          ${[1,2,3,4,5,6,7].map((v) => `
            <label style="display: inline-flex; flex-direction: column; align-items: center; cursor: pointer;">
              <input type="radio" name="performance_satisfaction" value="${v}" required>
              <span style="font-size: 0.9em; margin-top: 2px;">${v}</span>
            </label>`).join("")}
        </div>
      </div>

      <!-- Open-ended comments (optional) -->
      <div style="margin: 1.5em 0;">
        <label for="comments"><strong>Anything else you'd like to share?</strong>
          <span style="font-weight: normal; color: rgba(245,245,247,0.7);">(optional)</span></label>
        <textarea id="comments" name="comments" rows="4"
                  placeholder="Bug reports, strategy you used, things that confused you, etc."
                  style="width: 100%; margin-top: 6px; padding: 8px 10px;
                         border-radius: 8px; border: 1px solid #555;
                         background: #1f1f22; color: #f5f5f7; resize: vertical;
                         font-family: inherit; line-height: 1.45;"></textarea>
      </div>

      <p style="text-align: center; color: rgba(245,245,247,0.7); margin-top: 1.5em;">
        Press <b>Finish</b> to submit your data and return to Prolific.
      </p>
    </div>
  `,
  on_finish: function (data) {
    const r = data.response || {};

    // Gather race checkboxes into a single comma-separated list,
    // appending the free-text "other" if provided.
    const raceLabels = {
      race_american_indian:    "American Indian or Alaska Native",
      race_asian:              "Asian",
      race_black:              "Black or African American",
      race_hispanic:           "Hispanic, Latino, or Spanish origin",
      race_middle_eastern:     "Middle Eastern or North African",
      race_pacific_islander:   "Native Hawaiian or other Pacific Islander",
      race_white:              "White",
      race_prefer_not:         "Prefer not to say"
    };
    const races = Object.keys(raceLabels).filter((k) => r[k] === "1").map((k) => raceLabels[k]);
    if (r.race_other === "1" && r.race_other_text && r.race_other_text.trim()) {
      races.push(r.race_other_text.trim());
    }

    const gender = r.gender === "Self-describe"
      ? (r.gender_self_describe && r.gender_self_describe.trim()) || "Self-describe"
      : (r.gender || "");

    data.response = {
      age: r.age ? parseInt(r.age, 10) : null,
      gender,
      race_ethnicity: races.join("; "),
      minecraft_freq_1mo: r.minecraft_freq_1mo || "",
      performance_satisfaction: r.performance_satisfaction ? parseInt(r.performance_satisfaction, 10) : null,
      comments: (r.comments || "").trim()
    };
    data.phase = "demographics";
  }
};
