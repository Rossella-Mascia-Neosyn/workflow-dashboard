import { Box, Select } from "@chakra-ui/react";
import React from "react";
import { ThemeName, themes } from "../../editor-themes";
import { useEditorTheme } from "../../themeContext";

interface SelectThemesProps {
    placeholder: string;
}

const SelectThemes: React.FC<SelectThemesProps> = ({ placeholder }) => {
    const editorTheme = useEditorTheme();

    return (
        <Box marginLeft="2">
            <Select
                fontWeight="bold"
                color='var(--unicredit-primary-color)'
                borderRadius='lg'
                borderWidth="medium"
                placeholder={placeholder}
                borderColor='var(--unicredit-primary-color)'
                onChange={(e) => {
                    const theme = e?.target?.value as ThemeName;
                    if (theme) {
                        editorTheme.switchTheme(theme);
                    }
                }}
            >
                {Object.keys(themes).map((themeName) => (
                    <option value={themeName} key={themeName}>
                        {themes[themeName as ThemeName].name}
                    </option>
                ))}
            </Select>
        </Box>
    );
}

export default SelectThemes;