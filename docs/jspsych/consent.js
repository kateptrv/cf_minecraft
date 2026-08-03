// Online consent screen for the in-lab Minecraft counterfactual study.
// Text mirrors materials/Consent.docx (Stanford IRB, in-person format with
// ECG + GSR physiology). Adapted for the online launch page shown in-browser
// before the physio sensors are attached.

const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
        '<p style="color:#f5f5f7;"><b>Consent Form</b></p>' +
        '<div style="text-align:left; background-color:#2a2a2e; color:#f5f5f7; ' +
        'padding:24px 28px; max-width:900px; border-radius:14px; ' +
        'box-shadow:0 4px 18px rgba(0,0,0,0.35); line-height:1.5; margin:0 auto;">' +

        '<p><b>DESCRIPTION:</b> You are invited to participate in a research study on emotion. ' +
        'The overall purpose of the research is to learn more about the physiological and ' +
        'subjective qualities of emotion. In this study, you will be asked to perform ' +
        'various tasks on a computer which may include: looking at images or videos, ' +
        'listening to sounds, reading scenarios, or playing games. You may also be asked a ' +
        'number of different questions about your feelings and yourself. While you are ' +
        'doing these tasks, we may obtain physiological measures of your heart rate and ' +
        'sweat gland activity. Measuring heart activity through electrocardiogram (ECG), ' +
        'along with skin conductance using galvanic skin response (GSR), requires applying ' +
        "small amounts of gel to attach sensors to the skin's surface (torso and hands). " +
        'This procedure can result in minor skin irritation. Therefore, if you have high ' +
        'skin sensitivity you should not participate in a study that involves the sensors ' +
        'mentioned above. Other than that, these measures are totally safe and do not ' +
        'involve any physical discomfort.</p>' +

        '<p><b>RISKS AND BENEFITS:</b> We will do everything possible to maintain ' +
        'confidentiality and your name will not be associated with any of the data that ' +
        'you provide. Beyond any intrinsic satisfaction you feel in part of this research, ' +
        'there are no other benefits for you in participating. We cannot and do not ' +
        'guarantee or promise that you will receive any benefits from this study. There is ' +
        'a small chance of minor skin irritation from the sensors and gel application in ' +
        'ECG and GSR measures.</p>' +

        '<p><b>TIME INVOLVEMENT:</b> Your participation in this experiment will take ' +
        'approximately one hour.</p>' +

        '<p><b>PAYMENT:</b> You will receive a <b>$15 Amazon gift card</b> for completing ' +
        'the study. In addition, every 10 XP you earn in the mining task counts as one ' +
        '<b>raffle entry for a chance to win a Lego set</b>. The raffle drawing will be ' +
        'conducted in <b>December 2026</b>, and the winner will be contacted by email.</p>' +

        "<p><b>SUBJECT'S RIGHTS:</b> If you have read this form and have decided to " +
        'participate in this project, please understand your participation is voluntary and ' +
        'you have the right to withdraw your consent or discontinue participation at any ' +
        'time without penalty or loss of benefits to which you are otherwise entitled. ' +
        'You have the right to refuse to answer particular questions. Your individual ' +
        'privacy will be maintained in all published and written data resulting from the ' +
        'study.</p>' +

        '<p><b>CONTACT INFORMATION:</b><br>' +
        '<b>Questions, Concerns, or Complaints:</b> If you have any questions, concerns or ' +
        'complaints about this research study, its procedures, risks and benefits, you ' +
        'should ask the Protocol Director, James J. Gross, Ph.D. at (650) 723-1281 or ' +
        'gross@stanford.edu.<br>' +
        '<b>Independent Contact:</b> If you are not satisfied with how this study is being ' +
        'conducted, or if you have any concerns, complaints, or general questions about ' +
        'the research or your rights as a participant, please contact the Stanford ' +
        'Institutional Review Board (IRB) to speak to someone independent of the research ' +
        'team at (650) 723-2480 or toll free at 1-866-680-2906. You can also write to the ' +
        'Stanford IRB, Stanford University, 1705 El Camino Real, Palo Alto, CA 94306.</p>' +

        '<p>By clicking the button below, you acknowledge that you have read the above ' +
        'information, that you are 18 years of age or older, and give your consent to ' +
        'participate in this study and for us to analyze the resulting data.</p>' +
        '</div>' +

        '<p style="color:#f5f5f7;"> Do you agree with the terms of the experiment as ' +
        'explained above? </p>',

    choices: ['I agree']
};
